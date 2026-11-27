"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

export function SubmitSuccessToast({ show }: { show: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), 4200);
    const clean = window.setTimeout(() => {
      router.replace("/candidate/status");
    }, 4500);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(clean);
    };
  }, [show, router]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-10 sm:items-center sm:pt-0">
      <div className="absolute inset-0 bg-ink/20" aria-hidden />
      <div
        role="status"
        aria-live="polite"
        className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-white px-6 py-8 text-center shadow-xl"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-9 w-9" strokeWidth={2.5} />
        </span>
        <p className="text-lg font-semibold text-ink">Profil zur Prüfung eingereicht</p>
        <p className="text-sm leading-6 text-ink-muted">
          Deine Unterlagen sind beim Recruiter angekommen und werden geprüft.
        </p>
      </div>
    </div>
  );
}
