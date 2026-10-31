import { ValidationError } from '../controllers/errors/ValidationError.js';
import { ResourceNotFoundError, BusinessRuleError } from '../services/errors/index.js';
import { EntityNotFoundError } from '../repositories/errors/EntityNotFoundError.js';
import { DomainError, CupoInsuficienteError, EstadoCompraInvalidoError } from '../domain/errors/index.js';

export function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        message: 'El cuerpo de la solicitud contiene JSON inválido',
        code: 'INVALID_JSON',
      },
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        message: 'El cuerpo de la solicitud excede el tamaño permitido',
        code: 'REQUEST_TOO_LARGE',
      },
    });
  }

  // 1. Error de validación en la frontera HTTP (Controller)
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        message: err.message,
        code: err.code || 'VALIDATION_ERROR',
        details: err.details,
      },
    });
  }

  // 2. Entidad o Recurso no encontrado (Repository / Service)
  if (err instanceof ResourceNotFoundError || err instanceof EntityNotFoundError) {
    return res.status(404).json({
      error: {
        message: err.message,
        code: err.code || 'RESOURCE_NOT_FOUND',
      },
    });
  }

  // 3. Errores de cupo insuficiente o transición inválida (Domain)
  if (err instanceof CupoInsuficienteError || err instanceof EstadoCompraInvalidoError) {
    return res.status(409).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  // 4. Reglas de negocio incumplidas (Domain / Service)
  if (err instanceof BusinessRuleError || err instanceof DomainError) {
    return res.status(400).json({
      error: {
        message: err.message,
        code: err.code || 'BUSINESS_RULE_ERROR',
      },
    });
  }

  // 5. Error inesperado / no tipado (500)
  console.error('[Unhandled Error]:', err);
  return res.status(500).json({
    error: {
      message: 'Ocurrió un error interno en el servidor',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}
