import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listPortalProfilesForStaff } from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";
import { Badge } from "@/components/ui/badge";

export default async function PortalPruefungenPage() {
  const staff = await requireStaff();
  const rows = await listPortalProfilesForStaff(staff);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Portal-Prüfungen</h1>
        <p className="text-sm text-ink-muted">
          Eingereichte Kandidatenprofile aus dem Kandidatenportal prüfen.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
                <th className="px-5 py-3 font-medium">Kandidat</th>
                <th className="px-5 py-3 font-medium">Tätigkeit</th>
                <th className="px-5 py-3 font-medium">Standort</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">
                    Keine Portal-Einreichungen vorhanden.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.candidateId} className="hover:bg-surface-subtle">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="text-xs text-ink-muted">{row.email}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{row.desiredRole ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{row.city ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge variant="neutral">{portalStatusLabels[row.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/portal-pruefungen/${row.candidateId}`}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Prüfen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
