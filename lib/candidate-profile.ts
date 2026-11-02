export type AnonymizedProfile = {
  summary: string;
  qualifications: string[];
  industry_experience: string[];
  certificates: string[];
  work_history: {
    role: string;
    period: string;
    description: string;
  }[];
  skills: string[];
};

export const emptyProfile: AnonymizedProfile = {
  summary: "",
  qualifications: [],
  industry_experience: [],
  certificates: [],
  work_history: [],
  skills: [],
};

export function toProfile(raw: unknown): AnonymizedProfile {
  const value = (raw ?? {}) as Partial<AnonymizedProfile>;
  return {
    summary: value.summary ?? "",
    qualifications: value.qualifications ?? [],
    industry_experience: value.industry_experience ?? [],
    certificates: value.certificates ?? [],
    work_history: value.work_history ?? [],
    skills: value.skills ?? [],
  };
}

// Baustein-System: vordefinierte, wiederverwendbare Textbausteine je Kategorie,
// die per Klick in das Profil übernommen werden können.
export const profileBuildingBlocks: {
  category: keyof Pick<AnonymizedProfile, "qualifications" | "industry_experience" | "certificates" | "skills">;
  label: string;
  options: string[];
}[] = [
  {
    category: "qualifications",
    label: "Qualifikationen",
    options: [
      "Projektmanagement",
      "Teamleitung",
      "Agile Methoden (Scrum/Kanban)",
      "Prozessoptimierung",
      "Budgetverantwortung",
    ],
  },
  {
    category: "industry_experience",
    label: "Branchenerfahrung",
    options: [
      "IT & Software",
      "Fintech",
      "Gesundheitswesen",
      "Bauwesen",
      "Logistik",
      "E-Commerce",
    ],
  },
  {
    category: "certificates",
    label: "Zertifikate",
    options: [
      "PMP",
      "Scrum Master (CSM)",
      "AWS Certified Solutions Architect",
      "ITIL Foundation",
      "Prince2",
    ],
  },
  {
    category: "skills",
    label: "Skills",
    options: ["Java", "Python", "SAP", "Salesforce", "Power BI", "Englisch verhandlungssicher"],
  },
];

// Vorlagen für den Aufbau des Exposés (steuert nur Reihenfolge/Layout beim PDF-Export)
export const profileTemplates = [
  { value: "standard", label: "Standard-Exposé" },
  { value: "kompakt", label: "Kompakt (1 Seite)" },
  { value: "senior", label: "Senior-/Führungsprofil" },
] as const;

export type ProfileTemplate = (typeof profileTemplates)[number]["value"];
