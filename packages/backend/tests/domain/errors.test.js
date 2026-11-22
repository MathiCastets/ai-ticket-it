import { describe, it, expect } from '@jest/globals';
import {
  DomainError,
  CupoInsuficienteError,
  EstadoCompraInvalidoError,
  ReglaNegocioError,
} from '../../src/domain/errors/index.js';
import {
  ServiceError,
  ResourceNotFoundError,
  BusinessRuleError,
  UnauthorizedError,
  ForbiddenError,
} from '../../src/services/errors/index.js';

describe('Domain Errors', () => {
  describe('DomainError', () => {
    it('debe inicializarse con código por defecto DOMAIN_ERROR', () => {
      const err = new DomainError('Error genérico de dominio');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('DomainError');
      expect(err.message).toBe('Error genérico de dominio');
      expect(err.code).toBe('DOMAIN_ERROR');
    });

    it('debe inicializarse con código personalizado si se provee', () => {
      const err = new DomainError('Error específico', 'CUSTOM_DOMAIN_CODE');
      expect(err.name).toBe('DomainError');
      expect(err.message).toBe('Error específico');
      expect(err.code).toBe('CUSTOM_DOMAIN_CODE');
    });
  });

  describe('CupoInsuficienteError', () => {
    it('debe instanciarse correctamente con detalles del cupo', () => {
      const err = new CupoInsuficienteError('VIP', 5, 2);
      expect(err).toBeInstanceOf(DomainError);
      expect(err.name).toBe('CupoInsuficienteError');
      expect(err.code).toBe('CUPO_INSUFICIENTE');
      expect(err.tipoEntradaNombre).toBe('VIP');
      expect(err.solicitados).toBe(5);
      expect(err.disponibles).toBe(2);
      expect(err.message).toMatch(/No hay cupo suficiente para 'VIP'\. Solicitados: 5, Disponibles: 2/);
    });
  });

  describe('EstadoCompraInvalidoError', () => {
    it('debe instanciarse con mensaje por defecto sin detalle', () => {
      const err = new EstadoCompraInvalidoError('CANCELADA', 'CONFIRMADA');
      expect(err).toBeInstanceOf(DomainError);
      expect(err.name).toBe('EstadoCompraInvalidoError');
      expect(err.code).toBe('TRANSICION_ESTADO_INVALIDA');
      expect(err.estadoActual).toBe('CANCELADA');
      expect(err.nuevoEstado).toBe('CONFIRMADA');
      expect(err.message).toBe("Transición de estado no permitida desde 'CANCELADA' hacia 'CONFIRMADA'");
    });

    it('debe usar el detalle provisto si se especifica', () => {
      const detalle = 'Detalle explicativo de por qué no se puede cambiar';
      const err = new EstadoCompraInvalidoError('PENDIENTE', 'RECHAZADA', detalle);
      expect(err).toBeInstanceOf(DomainError);
      expect(err.name).toBe('EstadoCompraInvalidoError');
      expect(err.code).toBe('TRANSICION_ESTADO_INVALIDA');
      expect(err.estadoActual).toBe('PENDIENTE');
      expect(err.nuevoEstado).toBe('RECHAZADA');
      expect(err.message).toBe(detalle);
    });
  });

  describe('ReglaNegocioError', () => {
    it('debe inicializarse con código por defecto REGLA_NEGOCIO_ERROR', () => {
      const err = new ReglaNegocioError('Fallo en regla');
      expect(err).toBeInstanceOf(DomainError);
      expect(err.name).toBe('ReglaNegocioError');
      expect(err.message).toBe('Fallo en regla');
      expect(err.code).toBe('REGLA_NEGOCIO_ERROR');
    });

    it('debe inicializarse con código personalizado si se provee', () => {
      const err = new ReglaNegocioError('Fallo custom', 'CUSTOM_RULE_CODE');
      expect(err.message).toBe('Fallo custom');
      expect(err.code).toBe('CUSTOM_RULE_CODE');
    });
  });
});

describe('Service Errors', () => {
  describe('ServiceError', () => {
    it('debe inicializarse con código por defecto SERVICE_ERROR', () => {
      const err = new ServiceError('Error en capa de servicio');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ServiceError');
      expect(err.message).toBe('Error en capa de servicio');
      expect(err.code).toBe('SERVICE_ERROR');
    });

    it('debe inicializarse con código personalizado si se provee', () => {
      const err = new ServiceError('Error custom servicio', 'CUSTOM_SERVICE_CODE');
      expect(err.name).toBe('ServiceError');
      expect(err.message).toBe('Error custom servicio');
      expect(err.code).toBe('CUSTOM_SERVICE_CODE');
    });
  });

  describe('ResourceNotFoundError', () => {
    it('debe instanciarse correctamente con resourceName e id', () => {
      const err = new ResourceNotFoundError('Evento', 'evt-123');
      expect(err).toBeInstanceOf(ServiceError);
      expect(err.name).toBe('ResourceNotFoundError');
      expect(err.code).toBe('RESOURCE_NOT_FOUND');
      expect(err.resourceName).toBe('Evento');
      expect(err.id).toBe('evt-123');
      expect(err.message).toBe("Evento con id 'evt-123' no existe");
    });
  });

  describe('BusinessRuleError', () => {
    it('debe inicializarse con código por defecto BUSINESS_RULE_VIOLATION', () => {
      const err = new BusinessRuleError('Regla violada');
      expect(err).toBeInstanceOf(ServiceError);
      expect(err.name).toBe('BusinessRuleError');
      expect(err.message).toBe('Regla violada');
      expect(err.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('debe inicializarse con código personalizado si se provee', () => {
      const err = new BusinessRuleError('Regla violada custom', 'CUSTOM_BUSINESS_CODE');
      expect(err.message).toBe('Regla violada custom');
      expect(err.code).toBe('CUSTOM_BUSINESS_CODE');
    });
  });

  describe('UnauthorizedError', () => {
    it('debe inicializarse con valores por defecto', () => {
      const err = new UnauthorizedError();
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('UnauthorizedError');
      expect(err.message).toBe('Acceso no autorizado');
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.status).toBe(401);
    });

    it('debe inicializarse con mensaje y código personalizados', () => {
      const err = new UnauthorizedError('Token expirado', 'TOKEN_EXPIRED');
      expect(err.name).toBe('UnauthorizedError');
      expect(err.message).toBe('Token expirado');
      expect(err.code).toBe('TOKEN_EXPIRED');
      expect(err.status).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('debe inicializarse con valores por defecto', () => {
      const err = new ForbiddenError();
      expect(err).toBeInstanceOf(BusinessRuleError);
      expect(err.name).toBe('ForbiddenError');
      expect(err.message).toBe('Acceso prohibido');
      expect(err.code).toBe('FORBIDDEN');
      expect(err.status).toBe(403);
    });

    it('debe inicializarse con mensaje y código personalizados', () => {
      const err = new ForbiddenError('No tienes permisos para ver esto', 'CUSTOM_FORBIDDEN');
      expect(err.name).toBe('ForbiddenError');
      expect(err.message).toBe('No tienes permisos para ver esto');
      expect(err.code).toBe('CUSTOM_FORBIDDEN');
      expect(err.status).toBe(403);
    });
  });
});
