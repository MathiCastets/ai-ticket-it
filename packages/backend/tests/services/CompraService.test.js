import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CompraService } from '../../src/services/CompraService.js';
import { CompraRepository } from '../../src/repositories/inMemory/CompraRepository.js';
import { EventoRepository } from '../../src/repositories/inMemory/EventoRepository.js';
import { UsuarioRepository } from '../../src/repositories/inMemory/UsuarioRepository.js';
import { Compra, MARGEN_VENCIMIENTO_MS } from '../../src/domain/entities/Compra.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { EstadoCompra } from '../../src/domain/enums/EstadoCompra.js';
import { ResourceNotFoundError, BusinessRuleError, ForbiddenError } from '../../src/services/errors/index.js';

describe('CompraService', () => {
  let compraRepo;
  let eventoRepo;
  let usuarioRepo;
  let service;
  let comprador;
  let organizador;
  let otroUsuario;
  let tipoEntrada;
  let evento;

  function crearContexto({ disponibles = 50 } = {}) {
    comprador = new Usuario({ id: 'comp-1', nombre: 'Comprador', rol: 'comprador', email: 'comp@test.com' });
    organizador = new Usuario({ id: 'org-1', nombre: 'Organizador', rol: 'organizador', email: 'org@test.com' });
    otroUsuario = new Usuario({ id: 'user-ajeno', nombre: 'Ajeno', rol: 'comprador', email: 'ajeno@test.com' });
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
    usuarioRepo = new UsuarioRepository([comprador, organizador, otroUsuario]);
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

    test.each([0, -1])('rechaza cantidad %i con mensaje y código específicos', async (cantidad) => {
      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad,
        })
      ).rejects.toMatchObject({
        name: 'BusinessRuleError',
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'La cantidad de entradas debe ser un número entero mayor a 0',
      });
    });

    test('permite comprar exactamente el stock disponible', async () => {
      tipoEntrada.disponibles = 2;

      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 2,
      });

      expect(compra.cantidad).toBe(2);
      expect(tipoEntrada.disponibles).toBe(0);
    });

    test('lanza BusinessRuleError si la cantidad no es un entero', async () => {
      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad: 1.5,
        })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('lanza ResourceNotFoundError si el comprador no existe', async () => {
      await expect(
        service.realizarCompra({
          compradorId: 'comp-inexistente',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad: 1,
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('lanza ResourceNotFoundError si el evento no existe', async () => {
      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-inexistente',
          tipoEntradaId: 'te-1',
          cantidad: 1,
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('lanza ResourceNotFoundError si el tipo de entrada no existe en el evento', async () => {
      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-inexistente',
          cantidad: 1,
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('lanza BusinessRuleError si se intenta comprar para un evento que ya ocurrió', async () => {
      const eventoPasado = new Evento({
        id: 'evt-pasado',
        nombre: 'Evento Pasado',
        fecha: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        organizador,
        tiposEntrada: [new TipoEntrada({ id: 'te-pasado', nombre: 'General', precio: 5000, cupo: 20 })],
      });
      await eventoRepo.save(eventoPasado);

      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-pasado',
          tipoEntradaId: 'te-pasado',
          cantidad: 1,
        })
      ).rejects.toThrow(BusinessRuleError);

      expect(eventoPasado.tiposEntrada[0].disponibles).toBe(20);
    });

    test('lanza error si no hay cupo suficiente', async () => {
      crearContexto({ disponibles: 1 });
      compraRepo = new CompraRepository([]);
      eventoRepo = new EventoRepository([evento]);
      usuarioRepo = new UsuarioRepository([comprador, organizador]);
      service = new CompraService(compraRepo, eventoRepo, usuarioRepo);

      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad: 5,
        })
      ).rejects.toThrow();
    });

    test('rollback: restituye cupo si falla la persistencia de la compra', async () => {
      const disponiblesAntes = tipoEntrada.disponibles;
      const baseRepo = new CompraRepository([]);
      const failingRepo = {
        save: async () => {
          throw new Error('Fallo de persistencia inyectado');
        },
        delete: (...args) => baseRepo.delete(...args),
      };
      service = new CompraService(failingRepo, eventoRepo, usuarioRepo);

      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad: 2,
        })
      ).rejects.toThrow();

      expect(tipoEntrada.disponibles).toBe(disponiblesAntes);
    });

    test('expone el error original y los errores de rollback si fallan ambas compensaciones', async () => {
      const errorCompra = new Error('Fallo al guardar la compra');
      const errorBorrarCompra = new Error('Fallo al borrar la compra');
      const errorRestaurarEvento = new Error('Fallo al restaurar el evento');
      const failingCompraRepo = {
        save: jest.fn().mockRejectedValue(errorCompra),
        delete: jest.fn().mockRejectedValue(errorBorrarCompra),
      };
      const guardarEvento = jest
        .spyOn(eventoRepo, 'save')
        .mockResolvedValueOnce(evento)
        .mockRejectedValueOnce(errorRestaurarEvento);
      service = new CompraService(failingCompraRepo, eventoRepo, usuarioRepo);

      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad: 1,
        })
      ).rejects.toMatchObject({
        name: 'AggregateError',
        message:
          'No se pudo completar la compra de forma consistente. Además, falló una o más operaciones de rollback.',
        errors: [errorCompra, errorBorrarCompra, errorRestaurarEvento],
      });

      expect(guardarEvento).toHaveBeenCalledTimes(2);
      expect(failingCompraRepo.delete).toHaveBeenCalledTimes(1);
    });

    test('propaga errores inesperados al buscar el comprador', async () => {
      usuarioRepo.findById = async () => {
        throw new Error('Fallo inesperado comprador');
      };

      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad: 1,
        })
      ).rejects.toThrow('Fallo inesperado comprador');
    });

    test('propaga errores inesperados al buscar el evento', async () => {
      eventoRepo.findById = async () => {
        throw new Error('Fallo inesperado evento');
      };

      await expect(
        service.realizarCompra({
          compradorId: 'comp-1',
          eventoId: 'evt-1',
          tipoEntradaId: 'te-1',
          cantidad: 1,
        })
      ).rejects.toThrow('Fallo inesperado evento');
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

    test('permite cancelar si el actor es el comprador dueño', async () => {
      const compra = await realizarCompra(1);
      await service.cancelarCompra(compra.id, comprador);
      expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
    });

    test('permite cancelar si el actor es el organizador del evento', async () => {
      const compra = await realizarCompra(1);
      await service.cancelarCompra(compra.id, organizador);
      expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
    });

    test('lanza ForbiddenError si el actor no es ni el comprador ni el organizador', async () => {
      const compra = await realizarCompra(1);
      await expect(
        service.cancelarCompra(compra.id, otroUsuario)
      ).rejects.toThrow(ForbiddenError);
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

    test('registra actor string en historial al cancelar compra', async () => {
      const compra = await realizarCompra(1);
      await service.cancelarCompra(compra.id, 'Juan Pérez');
      expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
      expect(compra.historialCambios[compra.historialCambios.length - 1].quien).toBe('Juan Pérez');
    });

    test('registra actor objeto con nombreCompleto o nombre en historial al cancelar', async () => {
      const compra1 = await realizarCompra(1);
      await service.cancelarCompra(compra1.id, { id: 'comp-1', nombreCompleto: 'Juan Completo' });
      expect(compra1.historialCambios[compra1.historialCambios.length - 1].quien).toBe('Juan Completo');

      const compra2 = await realizarCompra(1);
      await service.cancelarCompra(compra2.id, { id: 'comp-1', nombre: 'Juan Nombre' });
      expect(compra2.historialCambios[compra2.historialCambios.length - 1].quien).toBe('Juan Nombre');

      const compra3 = await realizarCompra(1);
      await service.cancelarCompra(compra3.id, { id: 'comp-1' });
      expect(compra3.historialCambios[compra3.historialCambios.length - 1].quien).toBe('Comprador');
    });

    test('usa quien explícito en cancelarCompra si se provee', async () => {
      const compra = await realizarCompra(1);
      await service.cancelarCompra(compra.id, comprador, 'Soporte Técnico');
      expect(compra.historialCambios[compra.historialCambios.length - 1].quien).toBe('Soporte Técnico');
    });

    test('lanza BusinessRuleError si el tipo de entrada ya no existe en el evento al cancelar', async () => {
      const compra = await realizarCompra(1);
      evento.tiposEntrada = [];
      await expect(service.cancelarCompra(compra.id)).rejects.toMatchObject({
        name: 'BusinessRuleError',
        code: 'TIPO_ENTRADA_NO_DISPONIBLE',
        message: expect.stringMatching(/ya no existe en el evento/i),
      });
    });

    test('lanza AggregateError si falla el rollback en cancelarCompra', async () => {
      const compra = await realizarCompra(1);
      const errorOriginal = new Error('Error al guardar compra cancelada');
      const errorRollback = new Error('Error al revertir compra cancelada');
      compraRepo.save = jest.fn()
        .mockRejectedValueOnce(errorOriginal)
        .mockRejectedValueOnce(errorRollback);

      await expect(service.cancelarCompra(compra.id)).rejects.toMatchObject({
        name: 'AggregateError',
        message: expect.stringMatching(/No se pudo completar la cancelación de forma consistente/i),
      });
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

    test('permite marcar como utilizada si el actor es el organizador', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      await service.marcarUtilizada(compra.id, organizador);
      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    test('lanza ForbiddenError si un comprador intenta marcar como utilizada', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      await expect(
        service.marcarUtilizada(compra.id, comprador)
      ).rejects.toThrow(ForbiddenError);
    });

    test('lanza ForbiddenError si otro organizador intenta marcar como utilizada', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });
      const otroOrg = new Usuario({ id: 'org-ajeno', nombre: 'Otro Org', rol: 'organizador' });

      await expect(
        service.marcarUtilizada(compra.id, otroOrg)
      ).rejects.toThrow(ForbiddenError);
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

    test('registra actor string en historial al marcarUtilizada', async () => {
      const compra = await service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 });
      await service.marcarUtilizada(compra.id, 'Portería');
      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
      expect(compra.historialCambios[compra.historialCambios.length - 1].quien).toBe('Portería');
    });

    test('registra actor objeto con nombreCompleto o nombre en historial al marcarUtilizada', async () => {
      const compra1 = await service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 });
      await service.marcarUtilizada(compra1.id, { id: 'org-1', nombreCompleto: 'Staff Mayor' });
      expect(compra1.historialCambios[compra1.historialCambios.length - 1].quien).toBe('Staff Mayor');

      const compra2 = await service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 });
      await service.marcarUtilizada(compra2.id, { id: 'org-1', nombre: 'Staff Menor' });
      expect(compra2.historialCambios[compra2.historialCambios.length - 1].quien).toBe('Staff Menor');

      const compra3 = await service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 });
      await service.marcarUtilizada(compra3.id, { id: 'org-1' });
      expect(compra3.historialCambios[compra3.historialCambios.length - 1].quien).toBe('Acreditación en Puerta');
    });

    test('usa quien explícito en marcarUtilizada', async () => {
      const compra = await service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 });
      await service.marcarUtilizada(compra.id, organizador, 'Seguridad');
      expect(compra.historialCambios[compra.historialCambios.length - 1].quien).toBe('Seguridad');
    });

    test('rollback: restaura estado si falla save en marcarUtilizada', async () => {
      const compra = await service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 });
      const estadoPrevio = compra.estado;
      const historialPrevio = compra.historialCambios.length;

      let saveCount = 0;
      const failingRepo = {
        findById: (...args) => compraRepo.findById(...args),
        save: async (c) => {
          saveCount += 1;
          if (saveCount === 1) throw new Error('Fallo al acreditar compra');
          return c;
        },
      };
      service = new CompraService(failingRepo, eventoRepo, usuarioRepo);

      await expect(service.marcarUtilizada(compra.id)).rejects.toThrow('Fallo al acreditar compra');
      expect(compra.estado).toBe(estadoPrevio);
      expect(compra.historialCambios).toHaveLength(historialPrevio);
    });

    test('lanza AggregateError si falla el rollback en marcarUtilizada', async () => {
      const compra = await service.realizarCompra({ compradorId: 'comp-1', eventoId: 'evt-1', tipoEntradaId: 'te-1', cantidad: 1 });
      compraRepo.save = jest.fn()
        .mockRejectedValueOnce(new Error('Fallo acreditar'))
        .mockRejectedValueOnce(new Error('Fallo rollback acreditar'));

      await expect(service.marcarUtilizada(compra.id)).rejects.toMatchObject({
        name: 'AggregateError',
        message: expect.stringMatching(/No se pudo completar la acreditación de forma consistente/i),
      });
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

    test('permite calificar si el actor es el comprador dueño', async () => {
      const compra = await prepararCompraUtilizada();
      await service.calificarCompra(compra.id, { puntuacion: 5, comentario: 'Excelente!' }, comprador);

      expect(compra.reseniaRealizada).toBe(true);
    });

    test('lanza ForbiddenError si el actor no es el comprador de la entrada', async () => {
      const compra = await prepararCompraUtilizada();
      await expect(
        service.calificarCompra(compra.id, { puntuacion: 5, comentario: 'No soy el dueño' }, otroUsuario)
      ).rejects.toThrow(ForbiddenError);
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

    test('rollback: restaura resenias y reseniaRealizada si falla save en calificarCompra', async () => {
      const compra = await prepararCompraUtilizada();
      const reseniasAntes = [...compra.evento.resenias];
      const reseniaRealizadaAntes = compra.reseniaRealizada;

      let saveCount = 0;
      const failingRepo = {
        findById: (...args) => compraRepo.findById(...args),
        save: async (c) => {
          saveCount += 1;
          if (saveCount === 1) throw new Error('Fallo al guardar compra calificada');
          return c;
        },
      };
      service = new CompraService(failingRepo, eventoRepo, usuarioRepo);

      await expect(
        service.calificarCompra(compra.id, { puntuacion: 5, comentario: 'Genial' })
      ).rejects.toThrow('Fallo al guardar compra calificada');

      expect(compra.evento.resenias).toEqual(reseniasAntes);
      expect(compra.reseniaRealizada).toBe(reseniaRealizadaAntes);
    });

    test('lanza AggregateError si falla el rollback en calificarCompra', async () => {
      const compra = await prepararCompraUtilizada();
      compraRepo.save = jest.fn()
        .mockRejectedValueOnce(new Error('Fallo al calificar'))
        .mockRejectedValueOnce(new Error('Fallo rollback calificar'));

      await expect(
        service.calificarCompra(compra.id, { puntuacion: 5, comentario: 'Genial' })
      ).rejects.toMatchObject({
        name: 'AggregateError',
        message: expect.stringMatching(/No se pudo completar la calificación de forma consistente/i),
      });
    });
  });

  // ─── listarPorComprador ───────────────────────────────────────────────────

  describe('listarPorComprador', () => {
    test('retorna las compras del comprador', async () => {
      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const compras = await service.listarPorComprador('comp-1');
      expect(compras).toHaveLength(1);
      expect(compras[0].id).toBe(compra.id);

      const comprasOtro = await service.listarPorComprador('otro-comprador');
      expect(comprasOtro).toEqual([]);
    });
  });

  // ─── listarTodas ──────────────────────────────────────────────────────────

  describe('listarTodas', () => {
    test('retorna todas las compras registradas', async () => {
      expect(await service.listarTodas()).toEqual([]);

      const compra = await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const todas = await service.listarTodas();
      expect(todas).toHaveLength(1);
      expect(todas[0].id).toBe(compra.id);
    });
  });

  // ─── listarPorEvento ───────────────────────────────────────────────────────

  describe('listarPorEvento', () => {
    test('retorna todas las compras del evento si no se especifica organizadorId', async () => {
      await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const compras = await service.listarPorEvento('evt-1');
      expect(compras).toHaveLength(1);
      expect(compras[0].evento.id).toBe('evt-1');
    });

    test('retorna las compras del evento si organizadorId coincide con el organizador', async () => {
      await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const comprasOrg = await service.listarPorEvento('evt-1', 'org-1');
      expect(comprasOrg).toHaveLength(1);
    });

    test('retorna un arreglo vacío si organizadorId no coincide con el organizador del evento', async () => {
      await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const comprasOtroOrg = await service.listarPorEvento('evt-1', 'org-otro');
      expect(comprasOtroOrg).toEqual([]);
    });
  });

  // ─── listarPorOrganizador ─────────────────────────────────────────────────

  describe('listarPorOrganizador', () => {
    test('retorna las compras de eventos organizados por el organizador', async () => {
      await service.realizarCompra({
        compradorId: 'comp-1',
        eventoId: 'evt-1',
        tipoEntradaId: 'te-1',
        cantidad: 1,
      });

      const comprasOrg = await service.listarPorOrganizador('org-1');
      expect(comprasOrg).toHaveLength(1);

      const comprasOtroOrg = await service.listarPorOrganizador('org-otro');
      expect(comprasOtroOrg).toHaveLength(0);
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

  // ─── vencimiento automático (lazy) ────────────────────────────────────────

  describe('vencimiento automático por margen de 2 horas', () => {
    test('pasa CONFIRMADA a VENCIDA al listar después de 2 horas sin restituir cupo', async () => {
      const te = new TipoEntrada({ id: 'te-venc', nombre: 'General', precio: 5000, cupo: 10, disponibles: 8 });
      const eventoVencido = new Evento({
        id: 'evt-vencido',
        nombre: 'Evento Vencido',
        fecha: new Date(Date.now() - (MARGEN_VENCIMIENTO_MS + 60 * 1000)).toISOString(),
        organizador,
        tiposEntrada: [te],
      });
      await eventoRepo.save(eventoVencido);

      const compra = new Compra({
        id: 'compra-confirmada-vencida',
        comprador,
        evento: eventoVencido,
        tipoEntrada: te,
        cantidad: 2,
        total: 10000,
        estado: EstadoCompra.CONFIRMADA,
      });
      await compraRepo.save(compra);

      const compras = await service.listarPorComprador(comprador.id);
      expect(compras[0].estado).toBe(EstadoCompra.VENCIDA);
      expect(te.disponibles).toBe(8);
    });

    test('pasa PENDIENTE a CANCELADA y restituye cupo después de 2 horas', async () => {
      const te = new TipoEntrada({ id: 'te-pend', nombre: 'General', precio: 5000, cupo: 10, disponibles: 7 });
      const eventoVencido = new Evento({
        id: 'evt-pend-vencido',
        nombre: 'Evento Pendiente Vencido',
        fecha: new Date(Date.now() - (MARGEN_VENCIMIENTO_MS + 60 * 1000)).toISOString(),
        organizador,
        tiposEntrada: [te],
      });
      await eventoRepo.save(eventoVencido);

      const compra = new Compra({
        id: 'compra-pendiente-vencida',
        comprador,
        evento: eventoVencido,
        tipoEntrada: te,
        cantidad: 3,
        total: 15000,
        estado: EstadoCompra.PENDIENTE,
      });
      await compraRepo.save(compra);

      const recuperada = await service.obtenerPorId(compra.id);
      expect(recuperada.estado).toBe(EstadoCompra.CANCELADA);
      expect(te.disponibles).toBe(10);
    });

    test('mantiene CONFIRMADA dentro del margen de 2 horas y permite acreditar pero no cancelar', async () => {
      const te = new TipoEntrada({ id: 'te-curso', nombre: 'General', precio: 5000, cupo: 10, disponibles: 9 });
      const eventoEnCurso = new Evento({
        id: 'evt-en-curso',
        nombre: 'Evento En Curso',
        fecha: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        organizador,
        tiposEntrada: [te],
      });
      await eventoRepo.save(eventoEnCurso);

      const compra = new Compra({
        id: 'compra-en-curso',
        comprador,
        evento: eventoEnCurso,
        tipoEntrada: te,
        cantidad: 1,
        total: 5000,
        estado: EstadoCompra.CONFIRMADA,
      });
      await compraRepo.save(compra);

      await expect(service.cancelarCompra(compra.id, comprador)).rejects.toThrow();
      expect((await service.obtenerPorId(compra.id)).estado).toBe(EstadoCompra.CONFIRMADA);

      await service.marcarUtilizada(compra.id, organizador);
      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    test('impide acreditar una entrada que ya superó las 2 horas y la marca como VENCIDA', async () => {
      const te = new TipoEntrada({ id: 'te-tarde', nombre: 'General', precio: 5000, cupo: 10, disponibles: 9 });
      const eventoVencido = new Evento({
        id: 'evt-tarde',
        nombre: 'Evento Terminado',
        fecha: new Date(Date.now() - (MARGEN_VENCIMIENTO_MS + 60 * 1000)).toISOString(),
        organizador,
        tiposEntrada: [te],
      });
      await eventoRepo.save(eventoVencido);

      const compra = new Compra({
        id: 'compra-tarde',
        comprador,
        evento: eventoVencido,
        tipoEntrada: te,
        cantidad: 1,
        total: 5000,
        estado: EstadoCompra.CONFIRMADA,
      });
      await compraRepo.save(compra);

      await expect(service.marcarUtilizada(compra.id, organizador)).rejects.toThrow();
      expect(compra.estado).toBe(EstadoCompra.VENCIDA);
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
