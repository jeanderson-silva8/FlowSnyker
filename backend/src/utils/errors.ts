/**
 * Item 9 — Classes de erro customizadas.
 *
 * Todas as exceções de negócio herdam de AppError.
 * O middleware global de erro (errorHandler.ts) captura AppError
 * e retorna respostas padronizadas.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Autenticação necessária') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito — recurso já existe') {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas requisições — tente novamente mais tarde') {
    super(message, 429);
  }
}

export class LockedError extends AppError {
  constructor(message = 'Recurso bloqueado temporariamente') {
    super(message, 423);
  }
}
