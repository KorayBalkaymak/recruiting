export const DEMO_COOKIE = "cms-demo-user";

export function isDemoMode() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return !url || url.includes("your-project.supabase.co");
}
