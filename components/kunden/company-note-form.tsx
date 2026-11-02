"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCompanyNote } from "@/app/(app)/kunden/actions";

export function CompanyNoteForm({ companyId }: { companyId: string }) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = ref.current?.value ?? "";
        if (!value.trim()) return;
        startTransition(async () => {
          await addCompanyNote(companyId, value);
          if (ref.current) ref.current.value = "";
        });
      }}
      className="flex flex-col gap-2"
    >
      <Textarea ref={ref} rows={3} placeholder="Notiz zu diesem Kunden hinzufügen…" />
      <Button type="submit" size="sm" className="self-end" disabled={isPending}>
        {isPending ? "Speichert…" : "Notiz speichern"}
      </Button>
    </form>
  );
}
