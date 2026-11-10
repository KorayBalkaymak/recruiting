import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates, companies, offersCalculations } from "@/lib/db/schema";
import { num } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import { OfferPdf } from "@/components/rechner/offer-pdf";
import { AuthError, requireStaff } from "@/lib/auth";

async function getOfferForPdf(id: string) {
  if (isDemoMode()) {
    const supabase = createClient();
    const { data: offer, error } = await supabase
      .from("offers_calculations")
      .select(
        `*, company:companies(name), candidate:candidates(first_name, last_name, anonymized_title)`
      )
      .eq("id", id)
      .single();
    if (error || !offer) return null;
    return offer;
  }

  const [row] = await getDb()
    .select({
      offer: offersCalculations,
      companyName: companies.name,
      candidateFirst: candidates.firstName,
      candidateLast: candidates.lastName,
      candidateTitle: candidates.anonymizedTitle,
    })
    .from(offersCalculations)
    .leftJoin(companies, eq(companies.id, offersCalculations.companyId))
    .leftJoin(candidates, eq(candidates.id, offersCalculations.candidateId))
    .where(eq(offersCalculations.id, id))
    .limit(1);

  if (!row) return null;

  const o = row.offer;
  return {
    currency: o.currency,
    candidate_hourly_rate_net: num(o.candidateHourlyRateNet),
    factor_tier: o.factorTier,
    factor_value: num(o.factorValue) ?? 0,
    recommended_hourly_rate: num(o.recommendedHourlyRate),
    monthly_revenue: num(o.monthlyRevenue),
    margin_per_hour: num(o.marginPerHour),
    margin_per_month: num(o.marginPerMonth),
    margin_per_year: num(o.marginPerYear),
    assignment_location: o.assignmentLocation,
    assignment_duration_months: o.assignmentDurationMonths,
    company: row.companyName ? { name: row.companyName } : null,
    candidate:
      row.candidateFirst || row.candidateLast || row.candidateTitle
        ? {
            first_name: row.candidateFirst,
            last_name: row.candidateLast,
            anonymized_title: row.candidateTitle,
          }
        : null,
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireStaff();
  } catch (error) {
    if (error instanceof AuthError) {
      return new NextResponse(error.message, {
        status: error.code === "UNAUTHENTICATED" ? 401 : 403,
      });
    }
    throw error;
  }

  const offer = await getOfferForPdf(params.id);
  if (!offer) {
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
