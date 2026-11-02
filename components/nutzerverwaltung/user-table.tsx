"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials } from "@/lib/utils";
import { updateUserRole } from "@/app/(app)/nutzerverwaltung/actions";
import type { UserRole } from "@/types/supabase";

const roleLabels: Record<UserRole, string> = {
  recruiter: "Recruiter",
  kam: "Key Account Manager",
  geschaeftsleitung: "Geschäftsleitung",
  admin: "Admin",
};

export function UserTable({
  users,
}: {
  users: { id: string; full_name: string; email: string; role: UserRole }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
            <th className="px-5 py-3 font-medium">Nutzer</th>
            <th className="px-5 py-3 font-medium">E-Mail</th>
            <th className="px-5 py-3 font-medium">Rolle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {users.map((u) => {
            const [first, last] = u.full_name.split(" ");
            return (
            <tr key={u.id} className="hover:bg-surface-subtle">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
                    {initials(first, last)}
                  </span>
                  <span className="font-medium text-ink">{u.full_name}</span>
                </div>
              </td>
              <td className="px-5 py-3 text-ink-muted">{u.email}</td>
              <td className="px-5 py-3">
                <Select
                  value={u.role}
                  onValueChange={(v) => startTransition(() => updateUserRole(u.id, v as UserRole))}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
