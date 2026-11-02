import Link from "next/link";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { offerStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRecentOffers } from "@/app/(app)/rechner/actions";
import { OfferReviewActions } from "@/components/rechner/offer-review-actions";
import { OfferEmailGenerator } from "@/components/rechner/offer-email-generator";

export async function OffersList() {
  const offers = await getRecentOffers();

  return (
    <div className="rounded-lg border border-surface-border bg-white shadow-panel">
      <div className="border-b border-surface-border px-5 py-3">
        <h2 className="text-sm font-medium text-ink">Letzte Angebote & Freigabe-Status</h2>
      </div>
      {offers.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">Noch keine Angebote erstellt.</p>
      ) : (
        <ul className="divide-y divide-surface-border">
          {offers.map((offer: any) => {
            const statusInfo = offerStatusLabels[offer.status as keyof typeof offerStatusLabels];
            return (
              <li key={offer.id} className="flex flex-col gap-2 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-ink">
                    {offer.company?.name ?? "Ohne Kunde"} ·{" "}
                    {offer.candidate ? `${offer.candidate.first_name} ${offer.candidate.last_name}` : "Ohne Kandidat"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatCurrency(offer.recommended_hourly_rate, offer.currency)}/Std. · Deckungsbeitrag/Monat{" "}
                    {formatCurrency(offer.margin_per_month, offer.currency)} · {formatDate(offer.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  <Link
                    href={`/rechner/pdf/${offer.id}?download=1`}
                    target="_blank"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-subtle hover:text-ink"
                    title="Als PDF exportieren"
                  >
                    <Download className="h-4 w-4" />
                  </Link>
                  <OfferReviewActions offerId={offer.id} status={offer.status} />
                  {offer.status === "freigegeben" && (
                    <OfferEmailGenerator
                      offerId={offer.id}
                      companyId={offer.company?.id}
                      companyName={offer.company?.name ?? ""}
                      candidateLabel={
                        offer.candidate ? `${offer.candidate.first_name} ${offer.candidate.last_name}` : "Kandidat"
                      }
                      hourlyRate={formatCurrency(offer.recommended_hourly_rate, offer.currency)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
