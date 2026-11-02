"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteUser } from "@/app/(app)/nutzerverwaltung/actions";
import type { UserRole } from "@/types/supabase";

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "recruiter", label: "Recruiter" },
  { value: "kam", label: "Key Account Manager" },
  { value: "geschaeftsleitung", label: "Geschäftsleitung" },
  { value: "admin", label: "Admin" },
];

export function InviteUserForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("recruiter");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Nutzer einladen
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input placeholder="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input
          placeholder="E-Mail-Adresse"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
        <Button
          size="sm"
          disabled={!email || !fullName || isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await inviteUser(email, fullName, role);
                setOpen(false);
                setEmail("");
                setFullName("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Einladung fehlgeschlagen.");
              }
            })
          }
        >
          {isPending ? "Sendet…" : "Einladung senden"}
        </Button>
      </div>
    </div>
  );
}
