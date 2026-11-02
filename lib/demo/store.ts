export type DemoUser = {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: string;
};

const now = new Date().toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const monthsAgo = (months: number) => new Date(Date.now() - months * 30 * 86400000).toISOString();

const ANNA = "11111111-1111-1111-1111-111111111111";
const MAX = "22222222-2222-2222-2222-222222222222";
const SABINE = "33333333-3333-3333-3333-333333333333";

const TECHNOVA = "a1111111-0000-0000-0000-000000000001";
const BAUMEISTER = "a1111111-0000-0000-0000-000000000002";
const MEDICO = "a1111111-0000-0000-0000-000000000003";
const LOGISTIK = "a1111111-0000-0000-0000-000000000004";

const STEFAN = "b1111111-0000-0000-0000-000000000001";
const LAURA = "b1111111-0000-0000-0000-000000000002";
const DAVID = "b1111111-0000-0000-0000-000000000003";

const VAC_JAVA = "c1111111-0000-0000-0000-000000000001";
const VAC_BAU = "c1111111-0000-0000-0000-000000000002";

const CONTACT_TECH = "d1111111-0000-0000-0000-000000000001";
const CONTACT_BAU = "d1111111-0000-0000-0000-000000000002";
const CONTACT_MED = "d1111111-0000-0000-0000-000000000003";

export const DEMO_USERS: DemoUser[] = [
  {
    id: ANNA,
    email: "anna.recruiter@cms-platform.de",
    password: "demo1234",
    full_name: "Anna Recruiter",
    role: "recruiter",
  },
  {
    id: MAX,
    email: "max.kam@cms-platform.de",
    password: "demo1234",
    full_name: "Max Kamgruber",
    role: "kam",
  },
  {
    id: SABINE,
    email: "gl@cms-platform.de",
    password: "demo1234",
    full_name: "Sabine Geschäftsleitung",
    role: "geschaeftsleitung",
  },
];

export type DemoStore = {
  profiles: Record<string, unknown>[];
  companies: Record<string, unknown>[];
  contacts: Record<string, unknown>[];
  candidates: Record<string, unknown>[];
  vacancies: Record<string, unknown>[];
  vacancy_submissions: Record<string, unknown>[];
  offers_calculations: Record<string, unknown>[];
  activity_logs: Record<string, unknown>[];
  contracts: Record<string, unknown>[];
};

function createSeed(): DemoStore {
  return {
    profiles: DEMO_USERS.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      avatar_url: null,
      created_at: now,
      updated_at: now,
    })),
    companies: [
      {
        id: TECHNOVA,
        name: "TechNova GmbH",
        industry: "IT & Software",
        website: "https://technova.example",
        city: "Berlin",
        postal_code: "10115",
        country: "DE",
        status: "aktiv",
        inactive_reason: null,
        inactive_since: null,
        assigned_kam_id: MAX,
        last_contact_at: daysAgo(10),
        notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: BAUMEISTER,
        name: "BauMeister AG",
        industry: "Bauwesen",
        website: "https://baumeister.example",
        city: "München",
        postal_code: "80331",
        country: "DE",
        status: "ohne_aktive_vakanz",
        inactive_reason: null,
        inactive_since: null,
        assigned_kam_id: MAX,
        last_contact_at: monthsAgo(4),
        notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: MEDICO,
        name: "Medico Health Solutions",
        industry: "Gesundheitswesen",
        website: "https://medico.example",
        city: "Hamburg",
        postal_code: "20095",
        country: "DE",
        status: "neukunde",
        inactive_reason: null,
        inactive_since: null,
        assigned_kam_id: MAX,
        last_contact_at: daysAgo(2),
        notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: LOGISTIK,
        name: "Logistik Partner GmbH",
        industry: "Logistik",
        website: "https://logistikpartner.example",
        city: "Frankfurt am Main",
        postal_code: "60311",
        country: "DE",
        status: "inaktiv",
        inactive_reason: "kein_bedarf_mehr",
        inactive_since: monthsAgo(8),
        assigned_kam_id: MAX,
        last_contact_at: monthsAgo(9),
        notes: null,
        created_at: now,
        updated_at: now,
      },
    ],
    contacts: [
      {
        id: CONTACT_TECH,
        company_id: TECHNOVA,
        first_name: "Julia",
        last_name: "Hoffmann",
        position: "Head of Engineering",
        email: "julia.hoffmann@technova.example",
        phone: "+49 30 1234567",
        is_primary: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CONTACT_BAU,
        company_id: BAUMEISTER,
        first_name: "Thomas",
        last_name: "Berger",
        position: "HR-Leiter",
        email: "thomas.berger@baumeister.example",
        phone: "+49 89 7654321",
        is_primary: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CONTACT_MED,
        company_id: MEDICO,
        first_name: "Nina",
        last_name: "Keller",
        position: "Recruiting Managerin",
        email: "nina.keller@medico.example",
        phone: "+49 40 1122334",
        is_primary: true,
        created_at: now,
        updated_at: now,
      },
    ],
    candidates: [
      {
        id: STEFAN,
        first_name: "Stefan",
        last_name: "Wagner",
        email: "stefan.wagner@example.com",
        phone: "+49 151 1111111",
        anonymized_title: "Senior Java-Entwickler (m/w/d)",
        anonymized_profile: {
          summary: "Erfahrener Backend-Entwickler mit Fokus auf Microservices.",
          qualifications: ["Java", "Spring Boot", "Kubernetes"],
          industry_experience: ["Fintech", "E-Commerce"],
          certificates: ["AWS Certified Developer"],
        },
        status: "profil_fertig",
        hourly_rate_net: 85,
        location: "Berlin",
        assigned_recruiter_id: ANNA,
        availability_date: null,
        created_at: now,
        updated_at: daysAgo(1),
      },
      {
        id: LAURA,
        first_name: "Laura",
        last_name: "Schmidt",
        email: "laura.schmidt@example.com",
        phone: "+49 151 2222222",
        anonymized_title: "Projektleiterin Bauwesen (m/w/d)",
        anonymized_profile: {
          summary: "Projektleiterin mit 10 Jahren Erfahrung im Hochbau.",
          qualifications: ["Projektmanagement", "MS Project", "VOB"],
          industry_experience: ["Bauwesen"],
          certificates: ["PMP"],
        },
        status: "in_einreichung",
        hourly_rate_net: 70,
        location: "München",
        assigned_recruiter_id: ANNA,
        availability_date: null,
        created_at: now,
        updated_at: daysAgo(2),
      },
      {
        id: DAVID,
        first_name: "David",
        last_name: "Klein",
        email: "david.klein@example.com",
        phone: "+49 151 3333333",
        anonymized_title: "Data Scientist (m/w/d)",
        anonymized_profile: {
          summary: "Data Scientist mit Schwerpunkt NLP und ML-Ops.",
          qualifications: ["Python", "PyTorch", "MLOps"],
          industry_experience: ["Gesundheitswesen"],
          certificates: [],
        },
        status: "neu_eingegangen",
        hourly_rate_net: null,
        location: "Hamburg",
        assigned_recruiter_id: ANNA,
        availability_date: null,
        created_at: now,
        updated_at: daysAgo(3),
      },
    ],
    vacancies: [
      {
        id: VAC_JAVA,
        company_id: TECHNOVA,
        contact_id: CONTACT_TECH,
        title: "Senior Java-Entwickler (m/w/d)",
        source: "portal",
        status: "in_bearbeitung",
        employment_type: "arbeitnehmerueberlassung",
        requirements: "5+ Jahre Java, Spring Boot, Cloud-Erfahrung",
        budget_min: 80,
        budget_max: 95,
        currency: "EUR",
        location: "Berlin",
        assigned_recruiter_id: ANNA,
        filled_candidate_id: null,
        filled_start_date: null,
        filled_fee: null,
        close_reason: null,
        close_notes: null,
        created_at: daysAgo(12),
        updated_at: daysAgo(1),
      },
      {
        id: VAC_BAU,
        company_id: BAUMEISTER,
        contact_id: CONTACT_BAU,
        title: "Projektleiter Hochbau (m/w/d)",
        source: "email",
        status: "neue_anfrage",
        employment_type: "festanstellung",
        requirements: "Erfahrung in der Bauleitung, VOB-Kenntnisse",
        budget_min: 65000,
        budget_max: 80000,
        currency: "EUR",
        location: "München",
        assigned_recruiter_id: ANNA,
        filled_candidate_id: null,
        filled_start_date: null,
        filled_fee: null,
        close_reason: null,
        close_notes: null,
        created_at: daysAgo(4),
        updated_at: daysAgo(1),
      },
    ],
    vacancy_submissions: [
      {
        id: "e1111111-0000-0000-0000-000000000001",
        vacancy_id: VAC_JAVA,
        candidate_id: STEFAN,
        match_score: 92.5,
        status: "in_pruefung",
        submitted_at: daysAgo(3),
        feedback: null,
        created_at: daysAgo(3),
        updated_at: daysAgo(3),
      },
      {
        id: "e1111111-0000-0000-0000-000000000002",
        vacancy_id: VAC_BAU,
        candidate_id: LAURA,
        match_score: 88,
        status: "angefragt",
        submitted_at: daysAgo(1),
        feedback: null,
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
      },
    ],
    offers_calculations: [
      {
        id: "f1111111-0000-0000-0000-000000000001",
        vacancy_id: VAC_JAVA,
        candidate_id: STEFAN,
        company_id: TECHNOVA,
        created_by: ANNA,
        mode: "stundensatz",
        candidate_hourly_rate_net: 85,
        candidate_monthly_salary: null,
        currency: "EUR",
        assignment_duration_months: 6,
        assignment_location: "Berlin",
        factor_tier: "spezialist",
        factor_value: 2.3,
        recommended_hourly_rate: 195.5,
        monthly_revenue: 33396,
        margin_per_hour: 110.5,
        margin_per_month: 18856,
        margin_per_year: 226272,
        status: "zur_freigabe",
        sent_at: null,
        created_at: daysAgo(2),
        updated_at: daysAgo(2),
      },
    ],
    activity_logs: [
      {
        id: "aa111111-0000-0000-0000-000000000001",
        entity_type: "company",
        entity_id: TECHNOVA,
        type: "meeting",
        content: "Kickoff-Meeting zur neuen Vakanz Senior Java-Entwickler.",
        created_by: MAX,
        created_at: daysAgo(5),
      },
      {
        id: "aa111111-0000-0000-0000-000000000002",
        entity_type: "candidate",
        entity_id: STEFAN,
        type: "statusaenderung",
        content: 'Status von "In Bearbeitung" auf "Profil fertig" gesetzt.',
        created_by: ANNA,
        created_at: daysAgo(2),
      },
      {
        id: "aa111111-0000-0000-0000-000000000003",
        entity_type: "vacancy",
        entity_id: VAC_JAVA,
        type: "email",
        content: "Anonymisiertes Profil an Julia Hoffmann versendet.",
        created_by: ANNA,
        created_at: daysAgo(1),
      },
    ],
    contracts: [],
  };
}

const globalForDemo = globalThis as unknown as { __cmsDemoStore?: DemoStore };

export function getDemoStore(): DemoStore {
  if (!globalForDemo.__cmsDemoStore) {
    globalForDemo.__cmsDemoStore = createSeed();
  }
  return globalForDemo.__cmsDemoStore;
}

export function findDemoUser(email: string, password: string) {
  return DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
}

export function findDemoUserById(id: string) {
  return DEMO_USERS.find((u) => u.id === id);
}
