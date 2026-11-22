import { describe, it, expect } from '@jest/globals';
import { CambioEstadoCompra } from '../../src/domain/entities/CambioEstadoCompra.js';
import { EstadoCompra } from '../../src/domain/enums/EstadoCompra.js';

describe('CambioEstadoCompra Domain Entity', () => {
  it('debe inicializarse con todos los parámetros provistos', () => {
    const fecha = new Date('2026-05-10T14:30:00Z');
    const cambio = new CambioEstadoCompra({
      id: 'cec-custom-1',
      compraId: 'compra-123',
      estado: EstadoCompra.CONFIRMADA,
      quien: 'user_admin',
      fechaHora: fecha,
      motivo: 'Pago verificado',
    });

    expect(cambio.id).toBe('cec-custom-1');
    expect(cambio.compraId).toBe('compra-123');
    expect(cambio.estado).toBe(EstadoCompra.CONFIRMADA);
    expect(cambio.quien).toBe('user_admin');
    expect(cambio.fechaHora).toEqual(fecha);
    expect(cambio.motivo).toBe('Pago verificado');
  });

  it('debe generar valores por defecto para id, fechaHora y motivo si no se proveen', () => {
    const cambio = new CambioEstadoCompra({
      compraId: 'compra-456',
      estado: EstadoCompra.CANCELADA,
      quien: 'user_client',
    });

    expect(cambio.id).toMatch(/^cec-/);
    expect(cambio.compraId).toBe('compra-456');
    expect(cambio.estado).toBe(EstadoCompra.CANCELADA);
    expect(cambio.quien).toBe('user_client');
    expect(cambio.fechaHora).toBeInstanceOf(Date);
    expect(cambio.motivo).toBe('');
  });
});
