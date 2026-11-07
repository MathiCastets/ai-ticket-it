import { describe, test, expect, beforeEach } from '@jest/globals';
import { CompraService } from '../../src/services/CompraService.js';
import { CompraRepository } from '../../src/repositories/inMemory/CompraRepository.js';
import { EventoRepository } from '../../src/repositories/inMemory/EventoRepository.js';
import { UsuarioRepository } from '../../src/repositories/inMemory/UsuarioRepository.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { EstadoCompra } from '../../src/domain/enums/EstadoCompra.js';
import { ResourceNotFoundError, BusinessRuleError } from '../../src/services/errors/index.js';

describe('CompraService', () => {
  let compraRepo;
  let eventoRepo;
  let usuarioRepo;
  let service;
  let comprador;
  let organizador;
  let tipoEntrada;
  let evento;

  function crearContexto({ disponibles = 50 } = {}) {
    comprador = new Usuario({ id: 'comp-1', nombre: 'Comprador', rol: 'comprador', email: 'comp@test.com' });
    organizador = new Usuario({ id: 'org-1', nombre: 'Organizador', rol: 'organizador', email: 'org@test.com' });
    tipoEntrada = new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000, cupo: 100, disponibles });
    evento = new Evento({
      id: 'evt-1',
      nombre: 'Evento Test',
      fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organizador,
      tiposEntrada: [tipoEntrada],
    });
  }

  beforeEach(() => {
    crearContexto();
    compraRepo = new CompraRepository([]);
    eventoRepo = new EventoRepository([evento]);
    usuarioRepo = new UsuarioRepository([comprador, organizador]);
    service = new CompraService(compraRepo, eventoRepo, usuarioRepo);
  });

  // ─── realizarCompra ───────────────────────────────────────────────────────

  describe('realizarCompra', () => {
    test('crea una compra y descuenta el cupo disponible', async () => {
      const disponiblesAntes = tipoEntrada.disponibles;
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 2,
      });

      expect(compra).toBeDefined();
      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
      expect(compra.cantidad).toBe(2);
      expect(compra.total).toBe(20000);
      expect(tipoEntrada.disponibles).toBe(disponiblesAntes - 2);
    });

    test('la compra queda persistida en el repositorio', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const recuperada = await compraRepo.findById(compra.id);
      expect(recuperada).toBe(compra);
    });

    test('lanza BusinessRuleError si la cantidad es decimal', async () => {
      await expect(
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1.5 })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('lanza BusinessRuleError si la cantidad es cero', async () => {
      await expect(
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 0 })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('lanza BusinessRuleError si la cantidad es negativa', async () => {
      await expect(
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: -1 })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('lanza ResourceNotFoundError si el comprador no existe', async () => {
      await expect(
        service.realizarCompra({ compradorId: 'inexistente', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('lanza ResourceNotFoundError si el evento no existe', async () => {
      await expect(
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'inexistente', tipoEntradaId: 'te-1', cantidad: 1 })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('lanza error si no hay cupo suficiente', async () => {
      crearContexto({ disponibles: 1 });
      compraRepo = new CompraRepository([]);
      eventoRepo = new EventoRepository([evento]);
      usuarioRepo = new UsuarioRepository([comprador]);
      service = new CompraService(compraRepo, eventoRepo, usuarioRepo);

      await expect(
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 5 })
      ).rejects.toThrow();
    });

    test('rollback: restaura cupo si falla la persistencia de la compra', async () => {
      const disponiblesAntes = tipoEntrada.disponibles;
      const baseRepo = new CompraRepository([]);
      const failingCompraRepo = {
        findById: (...args) => baseRepo.findById(...args),
        save: async () => { throw new Error('Fallo inyectado'); },
        delete: (...args) => baseRepo.delete(...args),
      };
      service = new CompraService(failingCompraRepo, eventoRepo, usuarioRepo);

      await expect(
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 2 })
      ).rejects.toThrow('Fallo inyectado');

      expect(tipoEntrada.disponibles).toBe(disponiblesAntes);
    });
  });

  // ─── cancelarCompra ───────────────────────────────────────────────────────

  describe('cancelarCompra', () => {
    async function realizarCompra(cantidad = 1) {
      return service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad,
      });
    }

    test('cambia estado a REEMBOLSADA y restituye cupo', async () => {
      const compra = await realizarCompra(2);
      const disponiblesLuego = tipoEntrada.disponibles;
      await service.cancelarCompra(compra.id);

      expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
      expect(tipoEntrada.disponibles).toBe(disponiblesLuego + 2);
    });

    test('lanza error si se intenta cancelar una compra UTILIZADA', async () => {
      const compra = await realizarCompra();
      compra.marcarComoUtilizada('Staff');
      await compraRepo.save(compra);

      await expect(service.cancelarCompra(compra.id)).rejects.toThrow();
    });

    test('lanza error al cancelar una compra ya REEMBOLSADA', async () => {
      const compra = await realizarCompra();
      await service.cancelarCompra(compra.id);
      await expect(service.cancelarCompra(compra.id)).rejects.toThrow();
    });

    test('lanza ResourceNotFoundError si la compra no existe', async () => {
      await expect(service.cancelarCompra('inexistente')).rejects.toThrow(ResourceNotFoundError);
    });

    test('rollback: no cambia estado si falla persistencia', async () => {
      const compra = await realizarCompra();
      const estadoAntes = compra.estado;
      const historialAntes = compra.historialCambios.length;

      const baseRepo = new CompraRepository([compra]);
      let primeraLlamada = true;
      const failingRepo = {
        findById: (...args) => baseRepo.findById(...args),
        save: async (c) => {
          await baseRepo.save(c);
          if (primeraLlamada) {
            primeraLlamada = false;
            throw new Error('Fallo de cancelación inyectado');
          }
          return c;
        },
        delete: (...args) => baseRepo.delete(...args),
      };
      service = new CompraService(failingRepo, eventoRepo, usuarioRepo);

      await expect(service.cancelarCompra(compra.id)).rejects.toThrow();
      expect(compra.estado).toBe(estadoAntes);
      expect(compra.historialCambios.length).toBe(historialAntes);
    });
  });

  // ─── marcarUtilizada ──────────────────────────────────────────────────────

  describe('marcarUtilizada', () => {
    test('cambia estado a UTILIZADA', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      await service.marcarUtilizada(compra.id, 'Staff');
      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    test('lanza error si la compra no está CONFIRMADA', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });
      await service.cancelarCompra(compra.id);

      await expect(service.marcarUtilizada(compra.id)).rejects.toThrow();
    });
  });

  // ─── calificarCompra ──────────────────────────────────────────────────────

  describe('calificarCompra', () => {
    async function prepararCompraUtilizada() {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });
      await service.marcarUtilizada(compra.id, 'Staff');
      return compra;
    }

    test('agrega la reseña al evento y marca reseniaRealizada', async () => {
      const compra = await prepararCompraUtilizada();
      await service.calificarCompra(compra.id, { puntuacion: 4.5, comentario: 'Muy bueno!' });

      expect(compra.reseniaRealizada).toBe(true);
      expect(compra.evento.resenias).toHaveLength(1);
      expect(compra.evento.resenias[0].puntuacion).toBe(4.5);
    });

    test('lanza BusinessRuleError si la compra no está UTILIZADA', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      await expect(
        service.calificarCompra(compra.id, { puntuacion: 4, comentario: 'Sin usar' })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('lanza BusinessRuleError si ya fue calificada', async () => {
      const compra = await prepararCompraUtilizada();
      await service.calificarCompra(compra.id, { puntuacion: 4, comentario: 'Primera calificación' });

      await expect(
        service.calificarCompra(compra.id, { puntuacion: 5, comentario: 'Segunda calificación' })
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  // ─── obtenerPorId ─────────────────────────────────────────────────────────

  describe('obtenerPorId', () => {
    test('retorna la compra si existe', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const recuperada = await service.obtenerPorId(compra.id);
      expect(recuperada).toBe(compra);
    });

    test('lanza ResourceNotFoundError si no existe', async () => {
      await expect(service.obtenerPorId('inexistente')).rejects.toThrow(ResourceNotFoundError);
    });

    test('propaga errores inesperados del repositorio', async () => {
      const error = new Error('Error inesperado de repo');
      const failingRepo = { findById: async () => { throw error; } };
      service = new CompraService(failingRepo, eventoRepo, usuarioRepo);

      await expect(service.obtenerPorId('cualquier-id')).rejects.toBe(error);
    });
  });

  // ─── concurrencia ─────────────────────────────────────────────────────────

  describe('concurrencia', () => {
    test('solo una compra prospera cuando hay 1 cupo disponible', async () => {
      crearContexto({ disponibles: 1 });
      compraRepo = new CompraRepository([]);
      eventoRepo = new EventoRepository([evento]);
      usuarioRepo = new UsuarioRepository([comprador]);
      service = new CompraService(compraRepo, eventoRepo, usuarioRepo);

      const resultados = await Promise.allSettled([
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 }),
        service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 }),
      ]);

      const exitosas = resultados.filter((r) => r.status === 'fulfilled');
      const fallidas = resultados.filter((r) => r.status === 'rejected');

      expect(exitosas).toHaveLength(1);
      expect(fallidas).toHaveLength(1);
      expect(tipoEntrada.disponibles).toBe(0);
    });
  });
});
