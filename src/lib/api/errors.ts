export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message, "BAD_REQUEST");
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Access denied") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends ApiError {
  constructor(entity: string, id?: string) {
    super(404, `${entity} not found${id ? `: ${id}` : ""}`, "NOT_FOUND");
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(500, message, "INTERNAL_ERROR");
  }
}
