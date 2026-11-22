export class EntityNotFoundError extends Error {
  constructor(entityName, id) {
    super(`${entityName} con id '${id}' no fue encontrado`, 'ENTITY_NOT_FOUND');
    this.name = 'EntityNotFoundError';
    this.entityName = entityName;
    this.id = id;
    this.code = 'ENTITY_NOT_FOUND';
  }
}
