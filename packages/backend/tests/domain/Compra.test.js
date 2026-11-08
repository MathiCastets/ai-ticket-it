import { describe, test, expect } from '@jest/globals';
import { Compra, TRANSICIONES_PERMITIDAS } from '../../src/domain/entities/Compra.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { EstadoCompra } from '../../src/domain/enums/EstadoCompra.js';
import { EstadoCompraInvalidoError, ReglaNegocioError } from '../../src/domain/errors/index.js';

describe('Compra', () => {
  function crearUsuario(overrides = {}) {
    return new Usuario({ id: 'comp-1', nombre: 'Comprador Test', rol: 'comprador', ...overrides });
  }

  function crearEvento(fechaOffset = 7 * 24 * 60 * 60 * 1000) {
    return new Evento({
      id: 'evt-1',
      nombre: 'Evento Test',
      fecha: new Date(Date.now() + fechaOffset).toISOString(),
      organizador: new Usuario({ id: 'org-1', nombre: 'Org Test', rol: 'organizador' }),
      tiposEntrada: [new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000, cupo: 100 })],
    });
  }

  function crearCompra(overrides = {}) {
    const evento = crearEvento();
    return new Compra({
      id: 'compra-1',
      comprador: crearUsuario(),
      evento,
      tipoEntrada: evento.tiposEntrada[0],
      cantidad: 2,
      total: 20000,
      estado: EstadoCompra.CONFIRMADA,
      ...overrides,
    });
  }

  describe('construcción válida', () => {
    test('crea una compra con valores correctos', () => {
      const compra = crearCompra();
      expect(compra.id).toBe('compra-1');
      expect(compra.cantidad).toBe(2);
      expect(compra.total).toBe(20000);
      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
    });

    test('genera id automático si no se provee', () => {
      const compra = crearCompra({ id: undefined });
      expect(typeof compra.id).toBe('string');
      expect(compra.id.startsWith('compra-')).toBe(true);
    });

    test('inicializa mensajes como arreglo vacío', () => {
      const compra = crearCompra({ mensajes: undefined });
      expect(compra.mensajes).toEqual([]);
    });

    test('inicializa historialCambios como arreglo vacío', () => {
      const compra = crearCompra({ historialCambios: undefined });
      expect(compra.historialCambios).toEqual([]);
    });

    test('reemplaza mensajes e historial no válidos por arreglos vacíos', () => {
      const compra = crearCompra({ mensajes: null, historialCambios: null });
      expect(compra.mensajes).toEqual([]);
      expect(compra.historialCambios).toEqual([]);
    });

    test('inicializa reseniaRealizada en false', () => {
      const compra = crearCompra();
      expect(compra.reseniaRealizada).toBe(false);
    });

    test('normaliza reseniaRealizada a booleano', () => {
      const compra = crearCompra({ reseniaRealizada: 'si' });
      expect(compra.reseniaRealizada).toBe(true);
    });

    test('convierte fechaHora a objeto Date', () => {
      const compra = crearCompra();
      expect(compra.fechaHora).toBeInstanceOf(Date);
    });
  });

  describe('validaciones de construcción', () => {
    test('lanza error si no se provee comprador', () => {
      expect(() => crearCompra({ comprador: null })).toThrow('Compra requiere un comprador');
    });

    test('lanza error si no se provee evento', () => {
      expect(() => crearCompra({ evento: null })).toThrow('Compra requiere un evento');
    });

    test('lanza error si no se provee tipoEntrada', () => {
      expect(() => crearCompra({ tipoEntrada: null })).toThrow('Compra requiere un tipoEntrada');
    });

    test('lanza error si la cantidad es decimal', () => {
      expect(() => crearCompra({ cantidad: 1.5 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si la cantidad es cero', () => {
      expect(() => crearCompra({ cantidad: 0 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si la cantidad es negativa', () => {
      expect(() => crearCompra({ cantidad: -1 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si el total es negativo', () => {
      expect(() => crearCompra({ total: -100 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si el estado inicial no es válido', () => {
      expect(() => crearCompra({ estado: 'INVALIDO' })).toThrow(ReglaNegocioError);
    });
  });

  describe('actualizarEstado y máquina de estados', () => {
    test('expone el mapa constante de transiciones permitidas', () => {
      expect(TRANSICIONES_PERMITIDAS).toBeDefined();
      expect(TRANSICIONES_PERMITIDAS[EstadoCompra.PENDIENTE]).toEqual([
        EstadoCompra.CONFIRMADA,
        EstadoCompra.CANCELADA,
      ]);
      expect(TRANSICIONES_PERMITIDAS[EstadoCompra.CONFIRMADA]).toEqual([
        EstadoCompra.UTILIZADA,
        EstadoCompra.REEMBOLSADA,
        EstadoCompra.CANCELADA,
      ]);
      expect(TRANSICIONES_PERMITIDAS[EstadoCompra.UTILIZADA]).toEqual([]);
      expect(TRANSICIONES_PERMITIDAS[EstadoCompra.CANCELADA]).toEqual([]);
      expect(TRANSICIONES_PERMITIDAS[EstadoCompra.REEMBOLSADA]).toEqual([]);
    });

    test('permite transición de PENDIENTE a CONFIRMADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.PENDIENTE });
      compra.actualizarEstado(EstadoCompra.CONFIRMADA, 'Pasarela de pago');
      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
      expect(compra.historialCambios).toHaveLength(1);
    });

    test('permite transición de PENDIENTE a CANCELADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.PENDIENTE });
      compra.actualizarEstado(EstadoCompra.CANCELADA, 'Comprador');
      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.historialCambios).toHaveLength(1);
    });

    test('rechaza transición de PENDIENTE a UTILIZADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.PENDIENTE });
      expect(() => compra.actualizarEstado(EstadoCompra.UTILIZADA, 'Puerta')).toThrow(
        EstadoCompraInvalidoError
      );
    });

    test('rechaza transición de PENDIENTE a REEMBOLSADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.PENDIENTE });
      expect(() => compra.actualizarEstado(EstadoCompra.REEMBOLSADA, 'Sistema')).toThrow(
        EstadoCompraInvalidoError
      );
    });

    test('permite transiciones desde CONFIRMADA a UTILIZADA, REEMBOLSADA y CANCELADA', () => {
      const c1 = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      c1.actualizarEstado(EstadoCompra.UTILIZADA, 'Staff');
      expect(c1.estado).toBe(EstadoCompra.UTILIZADA);

      const c2 = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      c2.actualizarEstado(EstadoCompra.REEMBOLSADA, 'Admin');
      expect(c2.estado).toBe(EstadoCompra.REEMBOLSADA);

      const c3 = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      c3.actualizarEstado(EstadoCompra.CANCELADA, 'Organizador');
      expect(c3.estado).toBe(EstadoCompra.CANCELADA);
    });

    test('rechaza transición desde CONFIRMADA a PENDIENTE', () => {
      const compra = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      expect(() => compra.actualizarEstado(EstadoCompra.PENDIENTE, 'Sistema')).toThrow(
        EstadoCompraInvalidoError
      );
    });

    test('rechaza cualquier transición desde el estado terminal UTILIZADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.UTILIZADA });
      expect(() => compra.actualizarEstado(EstadoCompra.CONFIRMADA, 'Staff')).toThrow(
        EstadoCompraInvalidoError
      );
      expect(() => compra.actualizarEstado(EstadoCompra.CANCELADA, 'Staff')).toThrow(
        EstadoCompraInvalidoError
      );
      expect(() => compra.actualizarEstado(EstadoCompra.REEMBOLSADA, 'Staff')).toThrow(
        EstadoCompraInvalidoError
      );
    });

    test('no agrega al historial si el estado es el mismo (idempotencia)', () => {
      const compra = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      compra.actualizarEstado(EstadoCompra.CONFIRMADA, 'Sistema');
      expect(compra.historialCambios).toHaveLength(0);
    });

    test('lanza error si el estado nuevo no es válido', () => {
      const compra = crearCompra();
      expect(() => compra.actualizarEstado('INVENTADO', 'Sistema')).toThrow(
        EstadoCompraInvalidoError
      );
    });

    test('lanza error al intentar cambiar desde estado terminal CANCELADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.CANCELADA });
      expect(() => compra.actualizarEstado(EstadoCompra.CONFIRMADA, 'Sistema')).toThrow(
        EstadoCompraInvalidoError
      );
      expect(() => compra.actualizarEstado(EstadoCompra.REEMBOLSADA, 'Sistema')).toThrow(
        EstadoCompraInvalidoError
      );
    });

    test('lanza error al intentar cambiar desde estado terminal REEMBOLSADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.REEMBOLSADA });
      expect(() => compra.actualizarEstado(EstadoCompra.CONFIRMADA, 'Sistema')).toThrow(
        EstadoCompraInvalidoError
      );
      expect(() => compra.actualizarEstado(EstadoCompra.CANCELADA, 'Sistema')).toThrow(
        EstadoCompraInvalidoError
      );
    });
  });

  describe('puedeCancelarse', () => {
    test('puede cancelarse si está CONFIRMADA y el evento es futuro', () => {
      const compra = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      expect(compra.puedeCancelarse().puede).toBe(true);
    });

    test('no puede cancelarse si está UTILIZADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.UTILIZADA });
      expect(compra.puedeCancelarse().puede).toBe(false);
    });

    test('no puede cancelarse si ya está CANCELADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.CANCELADA });
      expect(compra.puedeCancelarse().puede).toBe(false);
    });

    test('no puede cancelarse si ya está REEMBOLSADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.REEMBOLSADA });
      expect(compra.puedeCancelarse().puede).toBe(false);
    });

    test('no puede cancelarse si el evento ya ocurrió', () => {
      const eventoTerminado = crearEvento(-24 * 60 * 60 * 1000); // ayer
      const compra = crearCompra({
        evento: eventoTerminado,
        tipoEntrada: eventoTerminado.tiposEntrada[0],
        estado: EstadoCompra.CONFIRMADA,
      });
      expect(compra.puedeCancelarse().puede).toBe(false);
    });
  });

  describe('cancelarParaReembolso', () => {
    test('cambia estado a REEMBOLSADA si puede cancelarse', () => {
      const compra = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      compra.cancelarParaReembolso('Comprador');
      expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
    });

    test('cambia estado a CANCELADA si estaba PENDIENTE y se solicita reembolso', () => {
      const compra = crearCompra({ estado: EstadoCompra.PENDIENTE });
      compra.cancelarParaReembolso('Comprador');
      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
    });

    test('lanza ReglaNegocioError si no puede cancelarse', () => {
      const compra = crearCompra({ estado: EstadoCompra.UTILIZADA });
      expect(() => compra.cancelarParaReembolso('Comprador')).toThrow(ReglaNegocioError);
    });
  });

  describe('marcarComoUtilizada', () => {
    test('cambia estado a UTILIZADA desde CONFIRMADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.CONFIRMADA });
      compra.marcarComoUtilizada('Staff');
      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    test('lanza ReglaNegocioError si no está CONFIRMADA', () => {
      const compra = crearCompra({ estado: EstadoCompra.CANCELADA });
      expect(() => compra.marcarComoUtilizada('Staff')).toThrow(ReglaNegocioError);
    });
  });

  describe('estaConversacionCerrada', () => {
    test('la conversación está cerrada si el evento terminó hace más de 48hs y no hay mensajes', () => {
      const eventoTerminado = crearEvento(-49 * 60 * 60 * 1000);
      const compra = crearCompra({
        evento: eventoTerminado,
        tipoEntrada: eventoTerminado.tiposEntrada[0],
        mensajes: [],
      });
      expect(compra.estaConversacionCerrada(Date.now())).toBe(true);
    });

    test('no está cerrada si el evento terminó hace menos de 48hs', () => {
      const eventoReciente = crearEvento(-24 * 60 * 60 * 1000);
      const compra = crearCompra({
        evento: eventoReciente,
        tipoEntrada: eventoReciente.tiposEntrada[0],
        mensajes: [],
      });
      expect(compra.estaConversacionCerrada(Date.now())).toBe(false);
    });

    test('no está cerrada si hay mensajes recientes (últimas 48hs)', () => {
      const eventoTerminado = crearEvento(-72 * 60 * 60 * 1000);
      const compra = crearCompra({
        evento: eventoTerminado,
        tipoEntrada: eventoTerminado.tiposEntrada[0],
        mensajes: [{ enviado: new Date(Date.now() - 24 * 60 * 60 * 1000) }],
      });
      expect(compra.estaConversacionCerrada(Date.now())).toBe(false);
    });

    test('está cerrada si tanto el evento como el último mensaje superan las 48hs de antigüedad', () => {
      // Evento: hace 72hs; último mensaje: hace 72hs → última actividad: 72hs → cerrada
      const eventoTerminado = crearEvento(-72 * 60 * 60 * 1000);
      const compra = crearCompra({
        evento: eventoTerminado,
        tipoEntrada: eventoTerminado.tiposEntrada[0],
        mensajes: [{ enviado: new Date(Date.now() - 72 * 60 * 60 * 1000) }],
      });
      expect(compra.estaConversacionCerrada(Date.now())).toBe(true);
    });
  });

  describe('diasFaltantes', () => {
    test('retorna días positivos para eventos futuros', () => {
      const compra = crearCompra();
      expect(compra.diasFaltantes()).toBeGreaterThan(0);
    });

    test('retorna 0 para eventos pasados', () => {
      const eventoTerminado = crearEvento(-24 * 60 * 60 * 1000);
      const compra = crearCompra({
        evento: eventoTerminado,
        tipoEntrada: eventoTerminado.tiposEntrada[0],
      });
      expect(compra.diasFaltantes()).toBe(0);
    });
  });

  describe('toJSON', () => {
    test('serializa la compra con eventoFecha y sin eventoFechaTexto desnormalizado', () => {
      const compra = crearCompra();
      const json = compra.toJSON();
      expect(json.eventoFecha).toBeDefined();
      expect(json.eventoFechaTexto).toBeUndefined();
    });

    test('expone la propiedad booleana conversacionCerrada en toJSON', () => {
      const compra = crearCompra();
      const json = compra.toJSON();
      expect(typeof json.conversacionCerrada).toBe('boolean');
    });

    test('no expone el email del comprador ni del organizador en toJSON', () => {
      const comprador = new Usuario({
        id: 'u-priv',
        nombre: 'Comprador',
        email: 'comprador.secreto@example.com',
      });
      const organizador = new Usuario({
        id: 'org-priv',
        nombre: 'Organizador',
        rol: 'organizador',
        email: 'organizador.secreto@example.com',
      });
      const evento = new Evento({
        id: 'evt-priv',
        nombre: 'Evento Privacidad',
        fecha: new Date(Date.now() + 86400000),
        organizador,
        tiposEntrada: [new TipoEntrada({ id: 't1', nombre: 'General', precio: 100, cupo: 10 })],
      });
      const compra = new Compra({
        id: 'c-priv',
        comprador,
        evento,
        tipoEntrada: evento.tiposEntrada[0],
      });

      const json = compra.toJSON();
      expect(json.comprador.email).toBeUndefined();
      expect('email' in json.comprador).toBe(false);
      expect(json.evento.organizador.email).toBeUndefined();
      expect('email' in json.evento.organizador).toBe(false);

      const str = JSON.stringify(compra);
      expect(str).not.toContain('comprador.secreto@example.com');
      expect(str).not.toContain('organizador.secreto@example.com');
      expect(str).not.toContain('"email"');
    });
  });
});
