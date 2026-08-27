export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(w: string) {
    super("NOT_FOUND", `${w} tidak ditemukan`, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(m = "Tidak berwenang") {
    super("FORBIDDEN", m, 403);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(m = "Silakan masuk") {
    super("UNAUTHENTICATED", m, 401);
  }
}

export class ConflictError extends AppError {
  constructor(c: string, m: string, d?: unknown) {
    super(c, m, 409, d);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super("VALIDATION_ERROR", "Data yang dikirim tidak valid", 400, details);
  }
}
