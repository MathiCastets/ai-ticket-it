import { describe, test, expect, beforeEach } from '@jest/globals';
import { CompraRepository } from '../../src/repositories/inMemory/CompraRepository.js';
import { Compra } from '../../src/domain/entities/Compra.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { EstadoCompra } from '../../src/domain/enums/EstadoCompra.js';
import { EntityNotFoundError } from '../../src/repositories/errors/EntityNotFoundError.js';

describe('CompraRepository', () => {
  let repository;
  let comprador;
  let evento;
  let tipoEntrada;

  function crearCompra(overrides = {}) {
    return new Compra({
      id: `compra-${Date.now()}-${Math.random()}`,
      comprador,
      evento,
      tipoEntrada,
      cantidad: 1,
      total: tipoEntrada.precio,
      estado: EstadoCompra.CONFIRMADA,
      ...overrides,
    });
  }

  beforeEach(() => {
    comprador = new Usuario({ id: 'comp-1', nombre: 'Comprador', rol: 'comprador' });
    const org = new Usuario({ id: 'org-1', nombre: 'Org', rol: 'organizador' });
    tipoEntrada = new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000, cupo: 100 });
    evento = new Evento({
      id: 'evt-1',
      nombre: 'Evento Test',
      fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organizador: org,
      tiposEntrada: [tipoEntrada],
    });
    // Instancia fresca sin seed para aislar cada test
    repository = new CompraRepository([]);
  });

  describe('save y findById', () => {
    test('guarda y recupera una compra por id', async () => {
      const compra = crearCompra({ id: 'compra-test-1' });
      await repository.save(compra);
      const recuperada = await repository.findById('compra-test-1');
      expect(recuperada).toBe(compra);
    });

    test('actualiza una compra existente al hacer save con el mismo id', async () => {
      const compra = crearCompra({ id: 'compra-test-2' });
      await repository.save(compra);
      compra.estado = EstadoCompra.UTILIZADA;
      await repository.save(compra);

      const recuperada = await repository.findById('compra-test-2');
      expect(recuperada.estado).toBe(EstadoCompra.UTILIZADA);

      const todas = await repository.findAll();
      expect(todas.filter((c) => c.id === 'compra-test-2')).toHaveLength(1);
    });

    test('lanza EntityNotFoundError si la compra no existe', async () => {
      await expect(repository.findById('inexistente')).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('findAll', () => {
    test('retorna arreglo vacío si no hay compras', async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    test('retorna todas las compras guardadas', async () => {
      const c1 = crearCompra({ id: 'c-1' });
      const c2 = crearCompra({ id: 'c-2' });
      await repository.save(c1);
      await repository.save(c2);
      const todas = await repository.findAll();
      expect(todas).toHaveLength(2);
    });
  });

  describe('findByCompradorId', () => {
    test('retorna solo las compras del comprador indicado', async () => {
      const otroComprador = new Usuario({ id: 'comp-2', nombre: 'Otro', rol: 'comprador' });
      const c1 = crearCompra({ id: 'c-1' }); // comp-1
      const c2 = crearCompra({ id: 'c-2', comprador: otroComprador }); // comp-2
      await repository.save(c1);
      await repository.save(c2);

      const result = await repository.findByCompradorId('comp-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c-1');
    });

    test('retorna arreglo vacío si el comprador no tiene compras', async () => {
      const result = await repository.findByCompradorId('comp-inexistente');
      expect(result).toEqual([]);
    });
  });

  describe('findByEventoId', () => {
    test('retorna las compras del evento indicado', async () => {
      const otroEvento = new Evento({
        id: 'evt-2',
        nombre: 'Otro Evento',
        fecha: new Date(Date.now() + 1000).toISOString(),
        organizador: new Usuario({ id: 'org-2', nombre: 'Org2', rol: 'organizador' }),
        tiposEntrada: [new TipoEntrada({ id: 'te-2', nombre: 'General', precio: 5000, cupo: 50 })],
      });
      const c1 = crearCompra({ id: 'c-1' }); // evt-1
      const c2 = new Compra({ id: 'c-2', comprador, evento: otroEvento, tipoEntrada: otroEvento.tiposEntrada[0], cantidad: 1, total: 5000 }); // evt-2
      await repository.save(c1);
      await repository.save(c2);

      const result = await repository.findByEventoId('evt-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c-1');
    });
  });

  describe('findByCodigo', () => {
    test('retorna la compra con el código indicado (case insensitive)', async () => {
      const compra = crearCompra({ id: 'c-codigo', ordenCodigo: '#TK-99999' });
      await repository.save(compra);

      const result = await repository.findByCodigo('#tk-99999');
      expect(result).toBe(compra);
    });

    test('retorna null si no existe el código', async () => {
      const result = await repository.findByCodigo('#TK-00000');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('elimina una compra por id', async () => {
      const compra = crearCompra({ id: 'c-delete' });
      await repository.save(compra);
      const deleted = await repository.delete('c-delete');
      expect(deleted).toBe(true);
      await expect(repository.findById('c-delete')).rejects.toThrow(EntityNotFoundError);
    });

    test('retorna false si la compra no existe', async () => {
      const result = await repository.delete('inexistente');
      expect(result).toBe(false);
    });
  });
});
