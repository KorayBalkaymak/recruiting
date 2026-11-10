import { AsyncLocalStorage } from "node:async_hooks";

const candidateSignupStore = new AsyncLocalStorage<boolean>();

export function runAsCandidateSignup<T>(fn: () => Promise<T>) {
  return candidateSignupStore.run(true, fn);
}

export function isCandidateSignup() {
  return candidateSignupStore.getStore() === true;
}
