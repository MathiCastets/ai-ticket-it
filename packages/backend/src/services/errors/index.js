export class ServiceError extends Error {
  constructor(message, code = 'SERVICE_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class ResourceNotFoundError extends ServiceError {
  constructor(resourceName, id) {
    super(`${resourceName} con id '${id}' no existe`, 'RESOURCE_NOT_FOUND');
    this.resourceName = resourceName;
    this.id = id;
  }
}

export class BusinessRuleError extends ServiceError {
  constructor(message, code = 'BUSINESS_RULE_VIOLATION') {
    super(message, code);
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Acceso no autorizado', code = 'UNAUTHORIZED') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = code;
    this.status = 401;
  }
}

export class ForbiddenError extends BusinessRuleError {
  constructor(message = 'Acceso prohibido', code = 'FORBIDDEN') {
    super(message, code);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}
