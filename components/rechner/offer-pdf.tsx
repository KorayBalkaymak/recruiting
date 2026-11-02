import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { factorTierLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, color: "#16181D" },
  headerBar: { height: 4, backgroundColor: "#FF5500", marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#5B616E", marginBottom: 24 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1px solid #E7EAEE",
    paddingVertical: 6,
  },
  label: { color: "#5B616E" },
  value: { fontWeight: 700 },
  highlightBox: {
    marginTop: 20,
    backgroundColor: "#FFEDE3",
    borderRadius: 8,
    padding: 16,
  },
  highlightLabel: { fontSize: 9, color: "#FF5500", textTransform: "uppercase" },
  highlightValue: { fontSize: 22, fontWeight: 700, color: "#FF5500", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94A3B8",
    borderTop: "1px solid #E7EAEE",
    paddingTop: 8,
  },
});

export function OfferPdf({
  companyName,
  candidateLabel,
  currency,
  hourlyRateNet,
  factorTier,
  factorValue,
  recommendedHourlyRate,
  monthlyRevenue,
  marginPerHour,
  marginPerMonth,
  marginPerYear,
  assignmentLocation,
  assignmentDurationMonths,
}: {
  companyName: string;
  candidateLabel: string;
  currency: string;
  hourlyRateNet: number;
  factorTier: keyof typeof factorTierLabels;
  factorValue: number;
  recommendedHourlyRate: number;
  monthlyRevenue: number;
  marginPerHour: number;
  marginPerMonth: number;
  marginPerYear: number;
  assignmentLocation?: string;
  assignmentDurationMonths?: number;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} />
        <Text style={styles.title}>Angebot — Verrechnungssatz</Text>
        <Text style={styles.subtitle}>
          {companyName} · {candidateLabel}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Kandidaten-Stundensatz (netto)</Text>
          <Text style={styles.value}>{formatCurrency(hourlyRateNet, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Faktor</Text>
          <Text style={styles.value}>
            {factorTierLabels[factorTier].label} ({factorValue.toFixed(2)})
          </Text>
        </View>
        {assignmentLocation && (
          <View style={styles.row}>
            <Text style={styles.label}>Einsatzort</Text>
            <Text style={styles.value}>{assignmentLocation}</Text>
          </View>
        )}
        {assignmentDurationMonths && (
          <View style={styles.row}>
            <Text style={styles.label}>Einsatzdauer</Text>
            <Text style={styles.value}>{assignmentDurationMonths} Monate</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Umsatz / Monat</Text>
          <Text style={styles.value}>{formatCurrency(monthlyRevenue, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Deckungsbeitrag / Stunde</Text>
          <Text style={styles.value}>{formatCurrency(marginPerHour, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Deckungsbeitrag / Monat</Text>
          <Text style={styles.value}>{formatCurrency(marginPerMonth, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Deckungsbeitrag / Jahr</Text>
          <Text style={styles.value}>{formatCurrency(marginPerYear, currency)}</Text>
        </View>

        <View style={styles.highlightBox}>
          <Text style={styles.highlightLabel}>Empfohlener Verrechnungssatz (netto, pro Stunde)</Text>
          <Text style={styles.highlightValue}>{formatCurrency(recommendedHourlyRate, currency)}</Text>
        </View>

        <Text style={styles.footer} fixed>
          Dieses Angebot wurde automatisch mit dem Verrechnungssatzrechner der CMS-Plattform erstellt
          und ist bis zur Freigabe unverbindlich.
        </Text>
      </Page>
    </Document>
  );
}
