import { describe, test, expect, beforeEach } from '@jest/globals';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Resenia } from '../../src/domain/entities/Resenia.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';

describe('Evento', () => {
  function crearUsuario(overrides = {}) {
    return new Usuario({ id: 'org-1', nombre: 'Organizador Test', rol: 'organizador', ...overrides });
  }

  function crearTipoEntrada(overrides = {}) {
    return new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000, cupo: 100, ...overrides });
  }

  function crearEvento(overrides = {}) {
    return new Evento({
      id: 'evt-1',
      nombre: 'Evento Test',
      fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organizador: crearUsuario(),
      tiposEntrada: [crearTipoEntrada()],
      ...overrides,
    });
  }

  describe('construcción válida', () => {
    test('crea un evento con valores correctos', () => {
      const evento = crearEvento();
      expect(evento.id).toBe('evt-1');
      expect(evento.nombre).toBe('Evento Test');
      expect(evento.resenias).toEqual([]);
      expect(evento.tiposEntrada).toHaveLength(1);
    });

    test('genera un id automático si no se provee', () => {
      const evento = crearEvento({ id: undefined });
      expect(typeof evento.id).toBe('string');
      expect(evento.id.startsWith('evt-')).toBe(true);
    });

    test('convierte la fecha a objeto Date y no expone fechaTexto', () => {
      const evento = crearEvento();
      expect(evento.fecha).toBeInstanceOf(Date);
      expect(evento.fechaTexto).toBeUndefined();
      expect(evento.toJSON().fechaTexto).toBeUndefined();
    });

    test('inicializa resenias como arreglo vacío por defecto', () => {
      const evento = crearEvento();
      expect(Array.isArray(evento.resenias)).toBe(true);
      expect(evento.resenias).toHaveLength(0);
    });

    test('inicializa multimedia como arreglo vacío por defecto', () => {
      const evento = crearEvento();
      expect(Array.isArray(evento.multimedia)).toBe(true);
    });

    test('normaliza multimedia y reseñas no válidas y toma la primera imagen disponible', () => {
      const evento = crearEvento({
        multimedia: ['imagen-principal.jpg'],
        imagen: '',
        resenias: null,
      });
      expect(evento.multimedia).toEqual(['imagen-principal.jpg']);
      expect(evento.imagen).toBe('imagen-principal.jpg');
      expect(evento.resenias).toEqual([]);

      const eventoSinMultimedia = crearEvento({ multimedia: null, resenias: {} });
      expect(eventoSinMultimedia.multimedia).toEqual([]);
      expect(eventoSinMultimedia.resenias).toEqual([]);
    });

    test('convierte tipos de entrada planos a instancias TipoEntrada', () => {
      const evento = new Evento({
        nombre: 'Evento Test',
        fecha: new Date(Date.now() + 1000).toISOString(),
        organizador: crearUsuario(),
        tiposEntrada: [{ id: 'te-plano', nombre: 'General', precio: 5000, cupo: 50 }],
      });
      expect(evento.tiposEntrada[0]).toBeInstanceOf(TipoEntrada);
    });
  });

  describe('validaciones de construcción', () => {
    test('lanza error si falta nombre', () => {
      expect(() => crearEvento({ nombre: undefined })).toThrow();
    });

    test('lanza error si falta fecha', () => {
      expect(() => crearEvento({ fecha: undefined })).toThrow();
    });
  });

  describe('obtenerTipoEntrada', () => {
    test('retorna el tipo de entrada correcto por id', () => {
      const evento = crearEvento();
      const te = evento.obtenerTipoEntrada('te-1');
      expect(te).toBeDefined();
      expect(te.id).toBe('te-1');
    });

    test('retorna undefined si el id no existe', () => {
      const evento = crearEvento();
      expect(evento.obtenerTipoEntrada('inexistente')).toBeUndefined();
    });
  });

  describe('tuPrecioEstaEntre', () => {
    test('retorna true si algún tipo de entrada tiene precio en el rango', () => {
      const evento = crearEvento({ tiposEntrada: [crearTipoEntrada({ precio: 10000 })] });
      expect(evento.tuPrecioEstaEntre(5000, 15000)).toBe(true);
    });

    test('retorna false si ningún tipo de entrada tiene precio en el rango', () => {
      const evento = crearEvento({ tiposEntrada: [crearTipoEntrada({ precio: 50000 })] });
      expect(evento.tuPrecioEstaEntre(1000, 10000)).toBe(false);
    });
  });

  describe('precioMinimo', () => {
    test('retorna el precio mínimo entre los tipos de entrada', () => {
      const evento = crearEvento({
        tiposEntrada: [
          crearTipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000 }),
          crearTipoEntrada({ id: 'te-2', nombre: 'VIP', precio: 25000 }),
        ],
      });
      expect(evento.precioMinimo()).toBe(10000);
    });

    test('retorna 0 si no hay tipos de entrada', () => {
      const evento = new Evento({
        nombre: 'Sin entradas',
        fecha: new Date(Date.now() + 1000).toISOString(),
        organizador: crearUsuario(),
        tiposEntrada: [crearTipoEntrada()],
      });
      evento.tiposEntrada = [];
      expect(evento.precioMinimo()).toBe(0);
    });
  });

  describe('organizadorRating y totalResenias', () => {
    let evento;
    let comprador;

    beforeEach(() => {
      evento = crearEvento();
      comprador = new Usuario({ id: 'comp-1', nombre: 'Comprador', rol: 'comprador' });
    });

    test('retorna 5.0 como rating cuando no hay reseñas', () => {
      expect(evento.organizadorRating).toBe(5.0);
    });

    test('retorna 0 como totalResenias cuando no hay reseñas', () => {
      expect(evento.totalResenias).toBe(0);
    });

    test('calcula el promedio de puntuaciones', () => {
      evento.resenias = [
        new Resenia({ comprador, eventoId: 'evt-1', puntuacion: 4, detalle: 'Muy bueno' }),
        new Resenia({ comprador, eventoId: 'evt-1', puntuacion: 5, detalle: 'Excelente' }),
      ];
      expect(evento.organizadorRating).toBe(4.5);
    });

    test('totalResenias refleja el número de reseñas', () => {
      evento.resenias = [
        new Resenia({ comprador, eventoId: 'evt-1', puntuacion: 4, detalle: 'Bueno' }),
      ];
      expect(evento.totalResenias).toBe(1);
    });
  });

  describe('agregarResenia', () => {
    test('agrega la reseña al inicio del arreglo', () => {
      const evento = crearEvento();
      const comprador = new Usuario({ id: 'comp-1', nombre: 'Comprador', rol: 'comprador' });
      const resenia1 = new Resenia({ comprador, eventoId: 'evt-1', puntuacion: 4, detalle: 'Primera reseña' });
      const resenia2 = new Resenia({ comprador, eventoId: 'evt-1', puntuacion: 5, detalle: 'Segunda reseña' });

      evento.agregarResenia(resenia1);
      evento.agregarResenia(resenia2);

      expect(evento.resenias[0]).toBe(resenia2);
      expect(evento.resenias[1]).toBe(resenia1);
    });
  });

  describe('toJSON y privacidad', () => {
    test('serializa organizador y categoría representados por valores simples u objetos', () => {
      const evento = crearEvento({
        organizador: { id: 'org-plain', nombre: 'Organizador', email: 'privado@example.com' },
        categoria: { id: 'cat-1', nombre: 'Música' },
      });

      const json = evento.toJSON();
      expect(json.organizador).toEqual({ id: 'org-plain', nombre: 'Organizador' });
      expect(json.categoriaNombre).toBe('Música');
      expect(json.organizadorNombre).toBe('Organizador');
      expect(json.organizadorId).toBe('org-plain');

      const eventoConValoresSimples = crearEvento({ organizador: 'org-2', categoria: 'Teatro' });
      const jsonSimple = eventoConValoresSimples.toJSON();
      expect(jsonSimple.organizadorNombre).toBe('org-2');
      expect(jsonSimple.organizadorId).toBe('');
      expect(jsonSimple.categoriaNombre).toBe('Teatro');
    });

    test('no expone el email del organizador en toJSON ni en JSON.stringify', () => {
      const organizador = new Usuario({
        id: 'org-test',
        nombre: 'Organizador Privado',
        rol: 'organizador',
        email: 'organizador.oculto@example.com',
      });
      const evento = crearEvento({ organizador });

      const json = evento.toJSON();
      expect(json.organizador.email).toBeUndefined();
      expect('email' in json.organizador).toBe(false);

      const str = JSON.stringify(evento);
      expect(str).not.toContain('organizador.oculto@example.com');
      expect(str).not.toContain('"email"');
    });

    test('no expone el email del comprador en las reseñas asociadas', () => {
      const comprador = new Usuario({
        id: 'comp-priv',
        nombre: 'Comprador Privado',
        email: 'comprador.oculto@example.com',
      });
      const evento = crearEvento();
      evento.agregarResenia(
        new Resenia({
          comprador,
          eventoId: evento.id,
          puntuacion: 5,
          detalle: 'Todo excelente',
        })
      );

      const json = evento.toJSON();
      expect(json.resenias[0].comprador.email).toBeUndefined();

      const str = JSON.stringify(evento);
      expect(str).not.toContain('comprador.oculto@example.com');
    });
  });
});
