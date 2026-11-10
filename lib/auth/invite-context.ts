import { AsyncLocalStorage } from "node:async_hooks";

const inviteStore = new AsyncLocalStorage<boolean>();

export function runAsInternalInvite<T>(fn: () => Promise<T>) {
  return inviteStore.run(true, fn);
}

export function isInternalInvite() {
  return inviteStore.getStore() === true;
}
