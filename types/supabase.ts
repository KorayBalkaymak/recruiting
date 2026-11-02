/**
 * Platzhalter-Typen für die Supabase-Datenbank.
 *
 * Sobald das Projekt mit einer echten Supabase-Instanz verbunden ist, ersetze
 * diese Datei durch generierte Typen:
 *
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > types/supabase.ts
 *
 * Bis dahin liefert dieser Stub grobe, handgeschriebene Row-Typen für die
 * wichtigsten Tabellen, damit die App bereits typsicher entwickelt werden kann.
 */

export type CompanyStatus = "neukunde" | "aktiv" | "ohne_aktive_vakanz" | "inaktiv";
export type CompanyInactiveReason =
  | "projekt_abgeschlossen"
  | "kein_bedarf_mehr"
  | "budget_gestoppt"
  | "keine_rueckmeldung"
  | "strategische_neuausrichtung";
export type CandidateStatus =
  | "neu_eingegangen"
  | "in_bearbeitung"
  | "profil_fertig"
  | "in_einreichung"
  | "inaktiv";
export type VacancyStatus = "neue_anfrage" | "offen" | "in_bearbeitung" | "besetzt" | "geschlossen";
export type VacancySource = "portal" | "email" | "telefon" | "sonstige";
export type EmploymentType = "festanstellung" | "arbeitnehmerueberlassung" | "freelance" | "werkvertrag";
export type SubmissionStatus =
  | "vorgeschlagen"
  | "angefragt"
  | "in_pruefung"
  | "verfuegbar"
  | "abgelehnt"
  | "vorstellungsgespraech"
  | "besetzt";
export type FactorTier = "basis" | "standard" | "spezialist" | "premium";
export type OfferStatus = "entwurf" | "zur_freigabe" | "in_pruefung" | "freigegeben" | "abgelehnt";
export type UserRole = "recruiter" | "kam" | "geschaeftsleitung" | "admin";
export type ContractStatus = "entwurf" | "aktiv" | "beendet" | "storniert";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          website: string | null;
          city: string | null;
          postal_code: string | null;
          country: string | null;
          status: CompanyStatus;
          inactive_reason: CompanyInactiveReason | null;
          inactive_since: string | null;
          assigned_kam_id: string | null;
          last_contact_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          company_id: string;
          first_name: string;
          last_name: string;
          position: string | null;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      candidates: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          anonymized_title: string | null;
          anonymized_profile: Record<string, unknown>;
          status: CandidateStatus;
          desired_salary_min: number | null;
          desired_salary_max: number | null;
          hourly_rate_net: number | null;
          availability_date: string | null;
          location: string | null;
          assigned_recruiter_id: string | null;
          cv_file_path: string | null;
          exposé_file_path: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      vacancies: {
        Row: {
          id: string;
          company_id: string;
          contact_id: string | null;
          title: string;
          source: VacancySource;
          status: VacancyStatus;
          employment_type: EmploymentType;
          requirements: string | null;
          budget_min: number | null;
          budget_max: number | null;
          currency: string;
          location: string | null;
          start_date: string | null;
          assigned_recruiter_id: string | null;
          filled_candidate_id: string | null;
          filled_start_date: string | null;
          filled_fee: number | null;
          close_reason: string | null;
          close_notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      vacancy_submissions: {
        Row: {
          id: string;
          vacancy_id: string;
          candidate_id: string;
          match_score: number | null;
          status: SubmissionStatus;
          submitted_at: string | null;
          feedback: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      offers_calculations: {
        Row: {
          id: string;
          vacancy_id: string | null;
          candidate_id: string | null;
          company_id: string | null;
          created_by: string | null;
          mode: "stundensatz" | "gehalt";
          candidate_hourly_rate_net: number | null;
          candidate_monthly_salary: number | null;
          currency: string;
          assignment_duration_months: number | null;
          assignment_location: string | null;
          factor_tier: FactorTier;
          factor_value: number;
          recommended_hourly_rate: number | null;
          monthly_revenue: number | null;
          margin_per_hour: number | null;
          margin_per_month: number | null;
          margin_per_year: number | null;
          status: OfferStatus;
          reviewed_by: string | null;
          review_notes: string | null;
          pdf_file_path: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          vacancy_id: string | null;
          candidate_id: string | null;
          company_id: string | null;
          contract_number: string;
          status: ContractStatus;
          start_date: string | null;
          end_date: string | null;
          hourly_rate: number | null;
          fee: number | null;
          currency: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          entity_type: "company" | "candidate" | "vacancy" | "offer";
          entity_id: string;
          type: string;
          content: string;
          created_by: string | null;
          created_at: string;
        };
      };
    };
  };
}
