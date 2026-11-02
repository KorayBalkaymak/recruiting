// Verrechnungssatzrechner — reine, testbare Berechnungslogik.
//
// Annahmen (unternehmensspezifisch anpassbar):
// - MONTHLY_HOURS: durchschnittliche abrechenbare Stunden pro Monat bei Vollzeit
// - BRUTTO_NETTO_FACTOR: Umrechnungsfaktor Arbeitgeberbrutto -> Netto-Basis
//   (Lohnnebenkosten/Arbeitgeberanteil), rein für die Eingabe-Konvenienz in Modus 1

export const MONTHLY_HOURS = 160;
export const BRUTTO_NETTO_FACTOR = 1.2;

export type FactorTier = "basis" | "standard" | "spezialist" | "premium";

export type CalculationResult = {
  candidateHourlyRateNet: number;
  recommendedHourlyRate: number;
  monthlyRevenue: number;
  marginPerHour: number;
  marginPerMonth: number;
  marginPerYear: number;
};

export function calculateFromHourlyRate(
  hourlyRateNet: number,
  factorValue: number
): CalculationResult {
  const recommendedHourlyRate = round2(hourlyRateNet * factorValue);
  return buildResult(hourlyRateNet, recommendedHourlyRate);
}

export function calculateFromSalary(
  monthlySalary: number,
  factorValue: number,
  monthlyHours: number = MONTHLY_HOURS
): CalculationResult {
  const hourlyRateNet = round2(monthlySalary / monthlyHours);
  const recommendedHourlyRate = round2(hourlyRateNet * factorValue);
  return buildResult(hourlyRateNet, recommendedHourlyRate, monthlyHours);
}

function buildResult(
  hourlyRateNet: number,
  recommendedHourlyRate: number,
  monthlyHours: number = MONTHLY_HOURS
): CalculationResult {
  const marginPerHour = round2(recommendedHourlyRate - hourlyRateNet);
  const monthlyRevenue = round2(recommendedHourlyRate * monthlyHours);
  const marginPerMonth = round2(marginPerHour * monthlyHours);
  const marginPerYear = round2(marginPerMonth * 12);

  return {
    candidateHourlyRateNet: hourlyRateNet,
    recommendedHourlyRate,
    monthlyRevenue,
    marginPerHour,
    marginPerMonth,
    marginPerYear,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function bruttoToNetto(brutto: number) {
  return round2(brutto / BRUTTO_NETTO_FACTOR);
}

export function nettoToBrutto(netto: number) {
  return round2(netto * BRUTTO_NETTO_FACTOR);
}
