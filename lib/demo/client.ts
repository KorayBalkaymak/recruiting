import { cookies } from "next/headers";
import { DEMO_COOKIE } from "./mode";
import {
  createDemoStaffSessionToken,
  demoStaffCookieOptions,
  verifyDemoStaffSessionToken,
} from "./staff-session";
import {
  DEMO_USERS,
  findDemoUser,
  findDemoUserById,
  getDemoStore,
  type DemoStore,
} from "./store";

type Row = Record<string, unknown>;
type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "neq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] }
  | { kind: "ilike"; column: string; pattern: string }
  | { kind: "gte"; column: string; value: number }
  | { kind: "or"; expr: string }
  | { kind: "not"; column: string; op: string; value: unknown };

const OPEN_VACANCY_STATUSES = new Set(["neue_anfrage", "offen", "in_bearbeitung"]);

type Relation = {
  table: keyof DemoStore;
  local: string;
  foreign: string;
  many: boolean;
};

const RELATIONS: Record<string, Record<string, Relation>> = {
  candidates: {
    assigned_recruiter: { table: "profiles", local: "assigned_recruiter_id", foreign: "id", many: false },
    submissions: { table: "vacancy_submissions", local: "id", foreign: "candidate_id", many: true },
  },
  companies: {
    assigned_kam: { table: "profiles", local: "assigned_kam_id", foreign: "id", many: false },
    contacts: { table: "contacts", local: "id", foreign: "company_id", many: true },
  },
  v_companies_active: {
    assigned_kam: { table: "profiles", local: "assigned_kam_id", foreign: "id", many: false },
    contacts: { table: "contacts", local: "id", foreign: "company_id", many: true },
  },
  v_companies_without_active_vacancy: {
    assigned_kam: { table: "profiles", local: "assigned_kam_id", foreign: "id", many: false },
    contacts: { table: "contacts", local: "id", foreign: "company_id", many: true },
  },
  vacancies: {
    company: { table: "companies", local: "company_id", foreign: "id", many: false },
    contact: { table: "contacts", local: "contact_id", foreign: "id", many: false },
    assigned_recruiter: { table: "profiles", local: "assigned_recruiter_id", foreign: "id", many: false },
    filled_candidate: { table: "candidates", local: "filled_candidate_id", foreign: "id", many: false },
    submissions: { table: "vacancy_submissions", local: "id", foreign: "vacancy_id", many: true },
  },
  vacancy_submissions: {
    vacancy: { table: "vacancies", local: "vacancy_id", foreign: "id", many: false },
    candidate: { table: "candidates", local: "candidate_id", foreign: "id", many: false },
  },
  contracts: {
    company: { table: "companies", local: "company_id", foreign: "id", many: false },
    candidate: { table: "candidates", local: "candidate_id", foreign: "id", many: false },
    vacancy: { table: "vacancies", local: "vacancy_id", foreign: "id", many: false },
  },
  offers_calculations: {
    company: { table: "companies", local: "company_id", foreign: "id", many: false },
    candidate: { table: "candidates", local: "candidate_id", foreign: "id", many: false },
  },
};

function splitTopLevel(input: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSelect(select: string) {
  const columns: string[] = [];
  const embeds: { alias: string; table: string; inner: string }[] = [];
  for (const part of splitTopLevel(select.replace(/\s+/g, " ").trim())) {
    const embedMatch = part.match(/^([A-Za-z0-9_]+):([A-Za-z0-9_]+)(?:![A-Za-z0-9_]+)?\((.*)\)$/s);
    const nestedMatch = part.match(/^([A-Za-z0-9_]+)\((.*)\)$/s);
    if (embedMatch) {
      embeds.push({ alias: embedMatch[1], table: embedMatch[2], inner: embedMatch[3] });
    } else if (nestedMatch && nestedMatch[1] !== "*") {
      embeds.push({ alias: nestedMatch[1], table: nestedMatch[1], inner: nestedMatch[2] });
    } else if (part !== "*") {
      columns.push(part);
    } else {
      columns.push("*");
    }
  }
  return { columns, embeds };
}

function pickColumns(row: Row, columns: string[]) {
  if (columns.length === 0 || columns.includes("*")) return { ...row };
  const next: Row = {};
  for (const col of columns) next[col] = row[col];
  return next;
}

function applyEmbeds(store: DemoStore, table: string, row: Row, select: string): Row {
  const { columns, embeds } = parseSelect(select);
  const base = pickColumns(row, columns);
  for (const embed of embeds) {
    const relation =
      RELATIONS[table]?.[embed.alias] ??
      RELATIONS[table]?.[embed.table] ??
      Object.values(RELATIONS[table] ?? {}).find((rel) => rel.table === embed.table);
    if (!relation) {
      base[embed.alias] = null;
      continue;
    }
    const relatedTable = getTableRows(store, relation.table);
    const localVal = row[relation.local];
    const matches = relatedTable.filter((item) => item[relation.foreign] === localVal);
    const mapped = matches.map((item) => applyEmbeds(store, relation.table, item, embed.inner || "*"));
    base[embed.alias] = relation.many ? mapped : mapped[0] ?? null;
  }
  return base;
}

function getTableRows(store: DemoStore, table: string): Row[] {
  if (table === "v_companies_active") {
    return store.companies.filter((company) => {
      if (company.status === "inaktiv") return false;
      const hasOpen = store.vacancies.some(
        (v) => v.company_id === company.id && OPEN_VACANCY_STATUSES.has(String(v.status))
      );
      const lastContact = company.last_contact_at ? new Date(String(company.last_contact_at)).getTime() : 0;
      const sixMonths = Date.now() - 180 * 86400000;
      return hasOpen || lastContact >= sixMonths;
    });
  }
  if (table === "v_companies_without_active_vacancy") {
    return store.companies
      .filter((company) => company.status !== "inaktiv")
      .filter((company) => store.vacancies.some((v) => v.company_id === company.id))
      .filter(
        (company) =>
          !store.vacancies.some(
            (v) => v.company_id === company.id && OPEN_VACANCY_STATUSES.has(String(v.status))
          )
      )
      .map((company) => {
        const vacancyDates = store.vacancies
          .filter((v) => v.company_id === company.id)
          .map((v) => new Date(String(v.updated_at)).getTime());
        const last = vacancyDates.length ? Math.max(...vacancyDates) : Date.now();
        const months = Math.floor((Date.now() - last) / (30 * 86400000));
        return {
          ...company,
          last_vacancy_activity: new Date(last).toISOString(),
          months_without_vacancy: months,
        };
      });
  }
  return store[table as keyof DemoStore] ?? [];
}

function matchIlike(value: unknown, pattern: string) {
  const text = String(value ?? "").toLowerCase();
  const needle = pattern.replace(/%/g, "").toLowerCase();
  return text.includes(needle);
}

function applyFilters(rows: Row[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.kind === "eq") return row[filter.column] === filter.value;
      if (filter.kind === "neq") return row[filter.column] !== filter.value;
      if (filter.kind === "in") return filter.values.includes(row[filter.column]);
      if (filter.kind === "ilike") return matchIlike(row[filter.column], filter.pattern);
      if (filter.kind === "gte") return Number(row[filter.column] ?? 0) >= filter.value;
      if (filter.kind === "or") {
        return filter.expr.split(",").some((part) => {
          const m = part.match(/^([A-Za-z0-9_]+)\.ilike\.(.*)$/);
          if (!m) return false;
          return matchIlike(row[m[1]], m[2]);
        });
      }
      if (filter.kind === "not") {
        if (filter.op === "is" && filter.value === null) return row[filter.column] != null;
        if (filter.op === "in") {
          const raw = String(filter.value).replace(/[()]/g, "");
          const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
          return !ids.includes(String(row[filter.column]));
        }
      }
      return true;
    })
  );
}

function toUser(id: string) {
  const demo = findDemoUserById(id);
  if (!demo) return null;
  return { id: demo.id, email: demo.email, user_metadata: { full_name: demo.full_name } };
}

class QueryBuilder {
  private filters: Filter[] = [];
  private selectSpec = "*";
  private countExact = false;
  private headOnly = false;
  private wantSingle = false;
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitTo: number | null = null;
  private insertRows: Row[] | null = null;
  private updatePatch: Row | null = null;

  constructor(
    private table: string,
    private store: DemoStore
  ) {}

  select(columns: string, options?: { count?: "exact"; head?: boolean }) {
    this.selectSpec = columns;
    this.countExact = options?.count === "exact";
    this.headOnly = options?.head === true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ kind: "neq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: "in", column, values });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ kind: "ilike", column, pattern });
    return this;
  }

  gte(column: string, value: number) {
    this.filters.push({ kind: "gte", column, value });
    return this;
  }

  or(expr: string) {
    this.filters.push({ kind: "or", expr });
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push({ kind: "not", column, op, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(n: number) {
    this.limitTo = n;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  insert(values: Row | Row[]) {
    this.insertRows = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: Row) {
    this.updatePatch = values;
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    // Demo QueryBuilder intentionally returns a loose thenable; keep Promise typing simple.
    return Promise.resolve(this.execute()).then(
      onfulfilled as (value: unknown) => TResult1 | PromiseLike<TResult1>,
      onrejected
    );
  }

  private execute() {
    const tableKey = this.table as keyof DemoStore;
    if (this.insertRows) {
      const created = this.insertRows.map((row) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...row,
      }));
      if (!this.store[tableKey]) (this.store as DemoStore & Record<string, Row[]>)[this.table] = [];
      this.store[tableKey].push(...created);
      const data = created.map((row) => applyEmbeds(this.store, this.table, row, this.selectSpec));
      return Promise.resolve({
        data: this.wantSingle ? data[0] ?? null : data,
        error: null,
        count: data.length,
      });
    }

    let rows = [...getTableRows(this.store, this.table)];
    rows = applyFilters(rows, this.filters);

    if (this.updatePatch) {
      const stamp = { ...this.updatePatch, updated_at: new Date().toISOString() };
      for (const row of rows) Object.assign(row, stamp);
    }

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows.sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return ascending ? -1 : 1;
        if (av > bv) return ascending ? 1 : -1;
        return 0;
      });
    }

    if (this.limitTo != null) rows = rows.slice(0, this.limitTo);

    const count = rows.length;
    if (this.headOnly) {
      return Promise.resolve({ data: null, error: null, count });
    }

    const mapped = rows.map((row) => applyEmbeds(this.store, this.table, row, this.selectSpec));
    if (this.wantSingle) {
      return Promise.resolve({ data: mapped[0] ?? null, error: mapped[0] ? null : { message: "not found" }, count });
    }
    return Promise.resolve({ data: mapped, error: null, count: this.countExact ? count : null });
  }
}

async function setDemoCookie(userId: string) {
  const token = await createDemoStaffSessionToken(userId);
  try {
    cookies().set({
      name: DEMO_COOKIE,
      value: token,
      ...demoStaffCookieOptions(),
    });
  } catch {
    // Middleware or read-only cookie context
  }
}

function clearDemoCookie() {
  try {
    cookies().set({
      name: DEMO_COOKIE,
      value: "",
      ...demoStaffCookieOptions(0),
      maxAge: 0,
    });
  } catch {
    // ignore
  }
}

async function currentUserId() {
  try {
    const token = cookies().get(DEMO_COOKIE)?.value;
    const payload = await verifyDemoStaffSessionToken(token);
    return payload?.userId ?? null;
  } catch {
    return null;
  }
}

export function createDemoClient() {
  const store = getDemoStore();

  return {
    from(table: string) {
      return new QueryBuilder(table, store);
    },
    auth: {
      async getUser() {
        const id = await currentUserId();
        const user = id ? toUser(id) : null;
        return { data: { user }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const user = findDemoUser(email, password);
        if (!user) {
          return { data: { user: null }, error: { message: "Ungültige Anmeldedaten" } };
        }
        try {
          await setDemoCookie(user.id);
        } catch (error) {
          return {
            data: { user: null },
            error: {
              message:
                error instanceof Error ? error.message : "Demo-Session konnte nicht erzeugt werden.",
            },
          };
        }
        return { data: { user: toUser(user.id) }, error: null };
      },
      async signOut() {
        clearDemoCookie();
        return { error: null };
      },
      admin: {
        async inviteUserByEmail(email: string) {
          const existing = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (existing) {
            return { data: { user: toUser(existing.id) }, error: null };
          }
          const id = crypto.randomUUID();
          DEMO_USERS.push({
            id,
            email,
            password: "demo1234",
            full_name: email,
            role: "recruiter",
          });
          return { data: { user: { id, email } }, error: null };
        },
      },
    },
  };
}
