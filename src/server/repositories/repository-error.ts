export class RepositoryError extends Error {
  override readonly name = "RepositoryError";
  constructor(
    message: string,
    readonly causeCode?: string,
  ) {
    super(message);
  }
}

export function ensureData<Row>(
  data: Row | null,
  error: { message: string; code?: string } | null,
): Row {
  if (error || data === null)
    throw new RepositoryError(
      error?.message ?? "Registro não retornado.",
      error?.code,
    );
  return data;
}
