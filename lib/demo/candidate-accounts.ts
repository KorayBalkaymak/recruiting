/** Edge-safe demo candidate account directory (no server-only). */

export type DemoCandidateAccount = {
  accountId: string;
  candidateId: string;
  email: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
};

export const DEMO_CANDIDATE_ACCOUNT_ID = "cacc1111-0000-0000-0000-000000000001";
export const DEMO_PORTAL_CANDIDATE_ID = "b1111111-0000-0000-0000-000000000099";

const seedAccounts: DemoCandidateAccount[] = [
  {
    accountId: DEMO_CANDIDATE_ACCOUNT_ID,
    candidateId: DEMO_PORTAL_CANDIDATE_ID,
    email: "kandidat@example.com",
    password: "demo1234",
    fullName: "Clara Kandidat",
    firstName: "Clara",
    lastName: "Kandidat",
  },
];

const globalForAccounts = globalThis as unknown as {
  __cmsDemoCandidateAccounts?: DemoCandidateAccount[];
};

export function getDemoCandidateAccounts() {
  if (!globalForAccounts.__cmsDemoCandidateAccounts) {
    globalForAccounts.__cmsDemoCandidateAccounts = [...seedAccounts];
  }
  return globalForAccounts.__cmsDemoCandidateAccounts;
}

export function findDemoCandidateByAccountId(accountId: string) {
  if (!accountId) return null;
  return getDemoCandidateAccounts().find((a) => a.accountId === accountId) ?? null;
}

export function findDemoCandidateByEmail(email: string, password: string) {
  return getDemoCandidateAccounts().find(
    (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
  );
}

export function addDemoCandidateAccount(account: DemoCandidateAccount) {
  getDemoCandidateAccounts().push(account);
}

export const DEMO_CANDIDATE_LOGIN_HINT = {
  email: "kandidat@example.com",
  password: "demo1234",
};
