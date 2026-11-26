import Link from "next/link";
import { count, desc, eq, inArray, ne } from "drizzle-orm";
import { Building2, Briefcase, ClipboardCheck, Users, SendHorizonal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activityLogs, candidates, companies, vacancies, vacancySubmissions } from "@/lib/db/schema";
import { toIsoRequired } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import { listPortalProfilesForStaff } from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";

async function getDashboardData() {
  if (isDemoMode()) {
    const supabase = createClient();

    const [
      { count: activeCandidates },
      { count: openVacancies },
      { count: activeCompanies },
      { count: pendingSubmissions },
    ] = await Promise.all([
      supabase.from("candidates").select("id", { count: "exact", head: true }).neq("status", "inaktiv"),
      supabase
        .from("vacancies")
        .select("id", { count: "exact", head: true })
        .in("status", ["offen", "in_bearbeitung"]),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "aktiv"),
      supabase
        .from("vacancy_submissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["angefragt", "in_pruefung"]),
    ]);

    const { data: recentActivity } = await supabase
      .from("activity_logs")
      .select("id, type, content, created_at")
      .order("created_at", { ascending: false })
      .limit(6);

    return {
      activeCandidates: activeCandidates ?? 0,
      openVacancies: openVacancies ?? 0,
      activeCompanies: activeCompanies ?? 0,
      pendingSubmissions: pendingSubmissions ?? 0,
      recentActivity: recentActivity ?? [],
    };
  }

  const db = getDb();
  const [[activeCandidates], [openVacancies], [activeCompanies], [pendingSubmissions], recent] =
    await Promise.all([
      db.select({ n: count() }).from(candidates).where(ne(candidates.status, "inaktiv")),
      db
        .select({ n: count() })
        .from(vacancies)
        .where(inArray(vacancies.status, ["offen", "in_bearbeitung"])),
      db.select({ n: count() }).from(companies).where(eq(companies.status, "aktiv")),
      db
        .select({ n: count() })
        .from(vacancySubmissions)
        .where(inArray(vacancySubmissions.status, ["angefragt", "in_pruefung"])),
      db
        .select({
          id: activityLogs.id,
          type: activityLogs.type,
          content: activityLogs.content,
          createdAt: activityLogs.createdAt,
        })
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(6),
    ]);

  return {
    activeCandidates: Number(activeCandidates?.n ?? 0),
    openVacancies: Number(openVacancies?.n ?? 0),
    activeCompanies: Number(activeCompanies?.n ?? 0),
    pendingSubmissions: Number(pendingSubmissions?.n ?? 0),
    recentActivity: recent.map((a) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      created_at: toIsoRequired(a.createdAt),
    })),
  };
}

export default async function DashboardPage() {
  const staff = await requireStaff();
  const [data, portalRows] = await Promise.all([
    getDashboardData(),
    listPortalProfilesForStaff(staff),
  ]);
  const portalPending = portalRows.filter(
    (row) => row.status === "submitted" || row.status === "in_review"
  );

  const kpis = [
    { label: "Aktive Kandidaten", value: data.activeCandidates, icon: Users, href: "/kandidaten" },
    { label: "Offene Vakanzen", value: data.openVacancies, icon: Briefcase, href: "/vakanzen" },
    { label: "Aktive Kunden", value: data.activeCompanies, icon: Building2, href: "/kunden" },
    {
      label: "Portal-Prüfungen",
      value: portalPending.length,
      icon: ClipboardCheck,
      href: "/portal-pruefungen",
    },
    {
      label: "Einreichungen in Prüfung",
      value: data.pendingSubmissions,
      icon: SendHorizonal,
      href: "/einreichungen",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted">Überblick über die aktuelle Recruiting-Pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="rounded-lg border border-surface-border bg-white p-4 shadow-panel transition-colors hover:border-brand/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">{kpi.label}</span>
                <Icon className="h-4 w-4 text-brand" strokeWidth={1.75} />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink">{kpi.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-sm font-medium text-ink">Zur Prüfung eingereicht</h2>
          <Link href="/portal-pruefungen" className="text-xs font-medium text-brand hover:underline">
            Alle ansehen
          </Link>
        </div>
        {portalPending.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">
            Keine neuen Portal-Einreichungen.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {portalPending.map((row) => (
              <li key={row.candidateId} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {row.firstName} {row.lastName}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {row.desiredRole ?? "Ohne Tätigkeit"}
                    {row.city ? ` · ${row.city}` : ""}
                    {` · ${portalStatusLabels[row.status]}`}
                  </p>
                </div>
                <Link
                  href={`/portal-pruefungen/${row.candidateId}`}
                  className="shrink-0 text-sm font-medium text-brand hover:underline"
                >
                  Prüfen
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="text-sm font-medium text-ink">Letzte Aktivitäten</h2>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">
            Noch keine Aktivitäten vorhanden.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {data.recentActivity.map((activity: { id: string; content: string; created_at: string }) => (
              <li key={activity.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-ink">{activity.content}</span>
                <span className="shrink-0 pl-4 text-xs text-ink-muted">
                  {new Intl.DateTimeFormat("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(activity.created_at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
