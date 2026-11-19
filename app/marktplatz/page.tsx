import { MarktplatzPage } from "@/components/marketing/marktplatz-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mandate entdecken — CMS Talents",
  description:
    "Exklusive, intern geprüfte Profile für anspruchsvolle Mandate. Ohne Registrierung filtern und entdecken.",
};

export default function PublicMarktplatz({
  searchParams,
}: {
  searchParams: { beruf?: string; q?: string };
}) {
  return <MarktplatzPage searchParams={searchParams} />;
}
