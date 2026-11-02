import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { AnonymizedProfile } from "@/lib/candidate-profile";

// IBM Plex Sans passend zum UI-Font auch im PDF verwenden
Font.register({
  family: "IBM Plex Sans",
  fonts: [
    { src: "https://fonts.gstatic.com/s/ibmplexsans/v19/zYX9KVElMYYaJe8bpLHnCwDKtdiIS-hDX63a.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/ibmplexsans/v19/zYXgKVElMYYaJe8bpLHnCwDKjbLmLW09Xzr7YsE.ttf", fontWeight: 600 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "IBM Plex Sans",
    fontSize: 10.5,
    color: "#16181D",
  },
  headerBar: {
    height: 4,
    backgroundColor: "#FF5500",
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: "#5B616E",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    marginTop: 16,
    marginBottom: 6,
    color: "#FF5500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paragraph: {
    lineHeight: 1.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#FFEDE3",
    color: "#FF5500",
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  workItem: {
    marginBottom: 8,
  },
  workRole: {
    fontWeight: 600,
    fontSize: 10.5,
  },
  workPeriod: {
    fontSize: 9,
    color: "#5B616E",
    marginBottom: 2,
  },
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

export function CandidateExposePdf({
  title,
  profile,
  candidateRefId,
}: {
  title: string;
  profile: AnonymizedProfile;
  candidateRefId: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} />
        <Text style={styles.title}>{title || "Anonymisiertes Kandidatenprofil"}</Text>
        <Text style={styles.subtitle}>Referenz-ID: {candidateRefId.slice(0, 8).toUpperCase()}</Text>

        {profile.summary && (
          <>
            <Text style={styles.sectionTitle}>Profil</Text>
            <Text style={styles.paragraph}>{stripHtml(profile.summary)}</Text>
          </>
        )}

        {profile.qualifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Qualifikationen</Text>
            <View style={styles.chipRow}>
              {profile.qualifications.map((q) => (
                <Text key={q} style={styles.chip}>{q}</Text>
              ))}
            </View>
          </>
        )}

        {profile.industry_experience.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Branchenerfahrung</Text>
            <View style={styles.chipRow}>
              {profile.industry_experience.map((q) => (
                <Text key={q} style={styles.chip}>{q}</Text>
              ))}
            </View>
          </>
        )}

        {profile.work_history.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Berufserfahrung</Text>
            {profile.work_history.map((entry, i) => (
              <View key={i} style={styles.workItem}>
                <Text style={styles.workRole}>{entry.role}</Text>
                <Text style={styles.workPeriod}>{entry.period}</Text>
                <Text style={styles.paragraph}>{entry.description}</Text>
              </View>
            ))}
          </>
        )}

        {profile.skills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.chipRow}>
              {profile.skills.map((q) => (
                <Text key={q} style={styles.chip}>{q}</Text>
              ))}
            </View>
          </>
        )}

        {profile.certificates.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Zertifikate</Text>
            <View style={styles.chipRow}>
              {profile.certificates.map((q) => (
                <Text key={q} style={styles.chip}>{q}</Text>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer} fixed>
          Dieses Dokument enthält ausschließlich anonymisierte Angaben. Kontaktdaten und Name des
          Kandidaten werden erst nach Freigabe durch den zuständigen Recruiter offengelegt.
        </Text>
      </Page>
    </Document>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
