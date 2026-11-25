import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionCandidate, getSessionStaff } from "@/lib/auth";
import { CandidatePortalNav } from "@/components/candidate/portal-nav";

export const dynamic = "force-dynamic";

export default async function CandidatePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getSessionStaff();
  if (staff) {
    redirect("/uebersicht");
  }

  const candidate = await getSessionCandidate();
  if (!candidate) {
    redirect("/candidate/login");
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <header className="bg-[#080A12] text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link href="/candidate/dashboard" className="flex items-baseline gap-2.5">
            <span className="text-[1.2rem] leading-none tracking-tight">CMS</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8B96D9]">
              Talents
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-6">
            <p className="hidden text-[12px] text-white/45 sm:block">{candidate.fullName}</p>
            <CandidatePortalNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 md:py-12">{children}</main>
    </div>
  );
}
