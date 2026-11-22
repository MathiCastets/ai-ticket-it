import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ValidationError } from '../../src/controllers/errors/ValidationError.js';
import {
  CupoInsuficienteError,
  DomainError,
  EstadoCompraInvalidoError,
} from '../../src/domain/errors/index.js';
import { EntityNotFoundError } from '../../src/repositories/errors/EntityNotFoundError.js';
import {
  BusinessRuleError,
  ForbiddenError,
  ResourceNotFoundError,
  UnauthorizedError,
} from '../../src/services/errors/index.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

describe('errorHandler middleware', () => {
  let res;
  let consoleError;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectResponse = (error, status, code) => {
    errorHandler(error, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code }),
      })
    );
  };

  test.each([
    [{ type: 'entity.parse.failed' }, 400, 'INVALID_JSON'],
    [{ type: 'entity.too.large' }, 413, 'REQUEST_TOO_LARGE'],
    [new ValidationError('Entrada inválida'), 400, 'VALIDATION_ERROR'],
    [new UnauthorizedError('Falta autenticación'), 401, 'UNAUTHORIZED'],
    [{ name: 'UnauthorizedError', message: 'No autorizado' }, 401, 'UNAUTHORIZED'],
    [{ status: 401, message: 'No autorizado' }, 401, 'UNAUTHORIZED'],
    [new ForbiddenError('Acceso prohibido'), 403, 'FORBIDDEN'],
    [{ name: 'ForbiddenError', message: 'Acceso prohibido' }, 403, 'FORBIDDEN'],
    [{ status: 403, message: 'Acceso prohibido' }, 403, 'FORBIDDEN'],
    [new ResourceNotFoundError('Evento', 'evt-1'), 404, 'RESOURCE_NOT_FOUND'],
    [new EntityNotFoundError('Evento', 'evt-1'), 404, 'ENTITY_NOT_FOUND'],
    [new CupoInsuficienteError('General', 2, 1), 409, 'CUPO_INSUFICIENTE'],
    [new EstadoCompraInvalidoError('PENDIENTE', 'UTILIZADA'), 409, 'TRANSICION_ESTADO_INVALIDA'],
    [new BusinessRuleError('Regla incumplida'), 400, 'BUSINESS_RULE_VIOLATION'],
    [new DomainError('Regla de dominio', 'DOMAIN_RULE'), 400, 'DOMAIN_RULE'],
  ])('mapea %s al status %i y código %s', (error, status, code) => {
    expectResponse(error, status, code);
  });

  test('usa los códigos por defecto cuando un error tipado no define código', () => {
    const error = new ValidationError('Entrada inválida');
    error.code = '';
    expectResponse(error, 400, 'VALIDATION_ERROR');
  });

  test('registra y oculta los detalles de errores inesperados', () => {
    const error = new Error('Detalle interno');
    errorHandler(error, {}, res, jest.fn());

    expect(consoleError).toHaveBeenCalledWith('[Unhandled Error]:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Ocurrió un error interno en el servidor',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  });
});
