import { MarktplatzPage } from "@/components/marketing/marktplatz-page";

export const dynamic = "force-dynamic";

export default function PublicMarktplatz({
  searchParams,
}: {
  searchParams: { beruf?: string; q?: string };
}) {
  return <MarktplatzPage searchParams={searchParams} />;
}
