import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MensajeService } from '../../src/services/MensajeService.js';
import { CompraRepository } from '../../src/repositories/inMemory/CompraRepository.js';
import { UsuarioRepository } from '../../src/repositories/inMemory/UsuarioRepository.js';
import { Compra } from '../../src/domain/entities/Compra.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { EstadoCompra } from '../../src/domain/enums/EstadoCompra.js';
import { BusinessRuleError, ForbiddenError, ResourceNotFoundError } from '../../src/services/errors/index.js';

describe('MensajeService', () => {
  let compraRepo;
  let usuarioRepo;
  let service;
  let comprador;
  let organizador;
  let otroUsuario;
  let compra;

  beforeEach(() => {
    comprador = new Usuario({ id: 'comp-1', nombre: 'Comprador', rol: 'comprador', email: 'comp@test.com' });
    organizador = new Usuario({ id: 'org-1', nombre: 'Organizador', rol: 'organizador', email: 'org@test.com' });
    otroUsuario = new Usuario({ id: 'otro-1', nombre: 'Ajeno', rol: 'comprador', email: 'otro@test.com' });

    const tipoEntrada = new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000, cupo: 100 });
    const evento = new Evento({
      id: 'evt-1',
      nombre: 'Evento Test',
      fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organizador,
      tiposEntrada: [tipoEntrada],
    });

    compra = new Compra({
      id: 'compra-1',
      comprador,
      evento,
      tipoEntrada,
      cantidad: 1,
      total: 10000,
      estado: EstadoCompra.CONFIRMADA,
      mensajes: [],
    });

    compraRepo = new CompraRepository([compra]);
    usuarioRepo = new UsuarioRepository([comprador, organizador, otroUsuario]);
    service = new MensajeService(compraRepo, usuarioRepo);
  });

  describe('enviarMensaje', () => {
    test('el comprador puede enviar un mensaje', async () => {
      const mensaje = await service.enviarMensaje('compra-1', {
        usuarioId: 'comp-1',
        texto: 'Hola, ¿cuándo abren las puertas?',
      });

      expect(mensaje).toBeDefined();
      expect(mensaje.mensaje).toBe('Hola, ¿cuándo abren las puertas?');
      expect(compra.mensajes).toHaveLength(1);
    });

    test('el organizador puede enviar un mensaje', async () => {
      await service.enviarMensaje('compra-1', {
        usuarioId: 'org-1',
        texto: 'Las puertas abren a las 20:00hs',
      });

      expect(compra.mensajes).toHaveLength(1);
    });

    test('un usuario ajeno no puede enviar mensajes', async () => {
      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'otro-1', texto: 'Mensaje no autorizado' })
      ).rejects.toThrow(ForbiddenError);

      await service.enviarMensaje('compra-1', {
        usuarioId: 'comp-1',
        texto: 'Autorizado',
      });
      expect(compra.mensajes.some((m) => m.mensaje === 'Mensaje no autorizado')).toBe(false);
    });

    test('no puede enviarse con texto vacío', async () => {
      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: '' })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('no puede enviarse con texto que no es string', async () => {
      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: 42 })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('lanza error si la conversación está cerrada', async () => {
      // Simular evento terminado hace más de 48hs
      compra.evento.fecha = new Date(Date.now() - 49 * 60 * 60 * 1000);
      compra.mensajes = [];

      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: 'Mensaje tardío' })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('lanza ResourceNotFoundError si la compra no existe', async () => {
      await expect(
        service.enviarMensaje('inexistente', { usuarioId: 'comp-1', texto: 'Hola' })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('lanza ResourceNotFoundError si el usuario no existe', async () => {
      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'user-no-existe', texto: 'Hola' })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('rollback: no persiste mensaje si falla el save', async () => {
      const mensajesAntes = compra.mensajes.length;
      const baseRepo = new CompraRepository([compra]);
      const failingRepo = {
        findById: (...args) => baseRepo.findById(...args),
        save: async () => { throw new Error('Fallo de persistencia del mensaje'); },
      };
      service = new MensajeService(failingRepo, usuarioRepo);

      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: 'Mensaje no guardado' })
      ).rejects.toThrow('Fallo de persistencia del mensaje');

      expect(compra.mensajes.length).toBe(mensajesAntes);
    });

    test('propaga errores inesperados del repositorio de compras', async () => {
      service = new MensajeService(
        { findById: async () => { throw new Error('Repositorio caído'); } },
        usuarioRepo
      );

      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: 'Hola' })
      ).rejects.toThrow('Repositorio caído');
    });

    test('propaga errores inesperados al resolver el usuario emisor', async () => {
      service = new MensajeService(compraRepo, {
        findById: async () => { throw new Error('Usuarios no disponibles'); },
      });

      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: 'Hola' })
      ).rejects.toThrow('Usuarios no disponibles');
    });

    test('reconoce al organizador cuando el evento lo representa como texto e id', async () => {
      compra.evento.organizador = 'Organizador';
      compra.evento.organizadorId = 'org-1';

      await expect(
        service.enviarMensaje('compra-1', { usuarioId: 'org-1', texto: 'Hola' })
      ).resolves.toMatchObject({ mensaje: 'Hola' });
    });
  });

  describe('obtenerMensajes', () => {
    test('retorna los mensajes de una compra', async () => {
      await service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: 'Primer mensaje' });
      const mensajes = await service.obtenerMensajes('compra-1');
      expect(mensajes).toHaveLength(1);
    });

    test('retorna arreglo vacío si no hay mensajes', async () => {
      const mensajes = await service.obtenerMensajes('compra-1');
      expect(mensajes).toEqual([]);
    });

    test('lanza ResourceNotFoundError si la compra no existe', async () => {
      await expect(service.obtenerMensajes('inexistente')).rejects.toThrow(ResourceNotFoundError);
    });

    test('devuelve una lista vacía si la compra no tiene una colección de mensajes', async () => {
      compra.mensajes = null;

      await expect(service.obtenerMensajes('compra-1')).resolves.toEqual([]);
    });
  });

  describe('marcarMensajesLeidos', () => {
    beforeEach(async () => {
      await service.enviarMensaje('compra-1', { usuarioId: 'comp-1', texto: 'Hola' });
    });

    test('el organizador puede marcar mensajes como leídos', async () => {
      const mensajes = await service.marcarMensajesLeidos('compra-1', 'org-1');
      expect(mensajes.some((m) => m.leidoPor?.includes('org-1'))).toBe(true);
    });

    test('el comprador puede marcar mensajes del organizador como leídos', async () => {
      // Enviar mensaje del organizador
      await service.enviarMensaje('compra-1', { usuarioId: 'org-1', texto: 'Respuesta' });
      const mensajes = await service.marcarMensajesLeidos('compra-1', 'comp-1');
      // Solo los mensajes del organizador deben quedar marcados
      const mensajesOrg = mensajes.filter((m) => m.usuario?.id === 'org-1');
      expect(mensajesOrg.every((m) => m.leidoPor?.includes('comp-1'))).toBe(true);
    });

    test('un usuario ajeno no puede marcar mensajes', async () => {
      await expect(
        service.marcarMensajesLeidos('compra-1', 'otro-1')
      ).rejects.toThrow(ForbiddenError);
    });

    test('lanza ResourceNotFoundError si la compra no existe', async () => {
      await expect(
        service.marcarMensajesLeidos('inexistente', 'comp-1')
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('no persiste cambios cuando todos los mensajes ya están leídos por el usuario', async () => {
      await service.marcarMensajesLeidos('compra-1', 'org-1');
      const guardar = jest.spyOn(compraRepo, 'save');

      await service.marcarMensajesLeidos('compra-1', 'org-1');

      expect(guardar).not.toHaveBeenCalled();
    });

    test('restaura los recibos de lectura si falla la persistencia', async () => {
      const mensaje = compra.mensajes[0];
      compraRepo.save = async () => {
        throw new Error('No se pudieron guardar las lecturas');
      };

      await expect(
        service.marcarMensajesLeidos('compra-1', 'org-1')
      ).rejects.toThrow('No se pudieron guardar las lecturas');
      expect(mensaje.leidoPor).toEqual([]);
    });
  });
});
