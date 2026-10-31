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
