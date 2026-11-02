import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OfferPdf } from "@/components/rechner/offer-pdf";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: offer, error } = await supabase
    .from("offers_calculations")
    .select(
      `*, company:companies(name), candidate:candidates(first_name, last_name, anonymized_title)`
    )
    .eq("id", params.id)
    .single();

  if (error || !offer) {
    return new NextResponse("Angebot nicht gefunden", { status: 404 });
  }

  const candidateLabel = offer.candidate
    ? offer.candidate.anonymized_title ?? `${offer.candidate.first_name} ${offer.candidate.last_name}`
    : "Kandidat";

  const stream = await renderToStream(
    <OfferPdf
      companyName={offer.company?.name ?? "Unbekannter Kunde"}
      candidateLabel={candidateLabel}
      currency={offer.currency}
      hourlyRateNet={offer.candidate_hourly_rate_net ?? 0}
      factorTier={offer.factor_tier}
      factorValue={offer.factor_value}
      recommendedHourlyRate={offer.recommended_hourly_rate ?? 0}
      monthlyRevenue={offer.monthly_revenue ?? 0}
      marginPerHour={offer.margin_per_hour ?? 0}
      marginPerMonth={offer.margin_per_month ?? 0}
      marginPerYear={offer.margin_per_year ?? 0}
      assignmentLocation={offer.assignment_location ?? undefined}
      assignmentDurationMonths={offer.assignment_duration_months ?? undefined}
    />
  );

  const download = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="angebot-${params.id.slice(0, 8)}.pdf"`,
    },
  });
}
