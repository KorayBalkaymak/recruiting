import { createClient } from "@/lib/supabase/server";
import { Building2, Briefcase, Users, SendHorizonal } from "lucide-react";

async function getDashboardData() {
  const supabase = createClient();

  const [{ count: activeCandidates }, { count: openVacancies }, { count: activeCompanies }, { count: pendingSubmissions }] =
    await Promise.all([
      supabase.from("candidates").select("id", { count: "exact", head: true }).neq("status", "inaktiv"),
      supabase.from("vacancies").select("id", { count: "exact", head: true }).in("status", ["offen", "in_bearbeitung"]),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "aktiv"),
      supabase.from("vacancy_submissions").select("id", { count: "exact", head: true }).in("status", ["angefragt", "in_pruefung"]),
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

const kpis = (data: Awaited<ReturnType<typeof getDashboardData>>) => [
  { label: "Aktive Kandidaten", value: data.activeCandidates, icon: Users },
  { label: "Offene Vakanzen", value: data.openVacancies, icon: Briefcase },
  { label: "Aktive Kunden", value: data.activeCompanies, icon: Building2 },
  { label: "Einreichungen in Prüfung", value: data.pendingSubmissions, icon: SendHorizonal },
];

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted">Überblick über die aktuelle Recruiting-Pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis(data).map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-lg border border-surface-border bg-white p-4 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">{kpi.label}</span>
                <Icon className="h-4 w-4 text-brand" strokeWidth={1.75} />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink">{kpi.value}</p>
            </div>
          );
        })}
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
            {data.recentActivity.map((activity) => (
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
