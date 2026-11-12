/** Auth/session pages must not prerender at build time (env differs on Vercel). */
export const dynamic = "force-dynamic";

export default function CandidateRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
