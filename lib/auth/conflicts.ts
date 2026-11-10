/** Safe conflict for concurrent / invalid review transitions. */
export class ConflictError extends Error {
  readonly code = "CONFLICT" as const;

  constructor(message = "Die Aktion konnte nicht ausgeführt werden, weil sich der Status geändert hat.") {
    super(message);
    this.name = "ConflictError";
  }
}
