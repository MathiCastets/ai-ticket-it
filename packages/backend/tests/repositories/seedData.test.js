import { describe, test, expect } from '@jest/globals';
import { createSeedData } from '../../src/repositories/seedData.js';

describe('Seed Data (Datos Semilla)', () => {
  test('los eventos futuros tienen fechas posteriores al momento actual', () => {
    const { eventos } = createSeedData();
    const ahora = Date.now();

    const futuros = eventos.filter(
      (e) => !['evt-sonora-aniversario', 'evt-teatro-3'].includes(e.id)
    );
    expect(futuros.length).toBeGreaterThanOrEqual(3);

    for (const ev of futuros) {
      expect(ev.fecha.getTime()).toBeGreaterThan(ahora);
    }
  });

  test('ningún evento define la propiedad desnormalizada fechaTexto', () => {
    const { eventos } = createSeedData();
    for (const ev of eventos) {
      expect(ev.fechaTexto).toBeUndefined();
      expect(ev.toJSON().fechaTexto).toBeUndefined();
    }
  });

  test('el evento aniversario y el evento teatro tienen fechas en el pasado', () => {
    const { eventos } = createSeedData();
    const ahora = Date.now();

    const aniversario = eventos.find((e) => e.id === 'evt-sonora-aniversario');
    expect(aniversario).toBeDefined();
    expect(aniversario.fecha.getTime()).toBeLessThan(ahora);

    const teatro = eventos.find((e) => e.id === 'evt-teatro-3');
    expect(teatro).toBeDefined();
    expect(teatro.fecha.getTime()).toBeLessThan(ahora);
  });

  test('compra-3 está en estado UTILIZADA para un evento pasado (para demostración de reseñas)', () => {
    const { compras } = createSeedData();
    const ahora = Date.now();
    const compra3 = compras.find((c) => c.id === 'compra-3');

    expect(compra3).toBeDefined();
    expect(compra3.estado).toBe('UTILIZADA');
    expect(compra3.evento.fecha.getTime()).toBeLessThan(ahora);
    expect(compra3.reseniaRealizada).toBe(false);
  });

  test('los eventos pasados incluyen reseñas iniciales válidas sin pisar compras pendientes de calificar', () => {
    const { eventos, compras } = createSeedData();

    for (const eventoId of ['evt-sonora-aniversario', 'evt-teatro-3']) {
      const evento = eventos.find((e) => e.id === eventoId);
      expect(evento).toBeDefined();
      expect(evento.resenias.length).toBeGreaterThanOrEqual(1);

      for (const resenia of evento.resenias) {
        expect(resenia.puntuacion).toBeGreaterThanOrEqual(0.5);
        expect(resenia.puntuacion).toBeLessThanOrEqual(5);
        expect(resenia.detalle.trim().length).toBeGreaterThan(0);
        expect(resenia.comprador).toBeDefined();
        expect(resenia.fechaHora.getTime()).toBeGreaterThan(evento.fecha.getTime());
      }
    }

    for (const compraId of ['compra-3', 'compra-4']) {
      const compra = compras.find((c) => c.id === compraId);
      expect(compra).toBeDefined();
      expect(compra.estado).toBe('UTILIZADA');
      expect(compra.reseniaRealizada).toBe(false);
    }
  });

  test('la disponibilidad de cupos en seed coincide con las compras vendidas', () => {
    const { eventos, compras } = createSeedData();

    for (const evento of eventos) {
      for (const tipoEntrada of evento.tiposEntrada) {
        const entradasVendidas = compras
          .filter(
            (compra) =>
              compra.evento.id === evento.id &&
              compra.tipoEntrada.id === tipoEntrada.id &&
              !['CANCELADA', 'REEMBOLSADA'].includes(compra.estado)
          )
          .reduce((total, compra) => total + compra.cantidad, 0);

        expect(tipoEntrada.disponibles).toBe(tipoEntrada.cupo - entradasVendidas);
      }
    }
  });

  test('los mensajes de compras tienen fechas válidas', () => {
    const { compras } = createSeedData();

    for (const compra of compras) {
      for (const msg of compra.mensajes) {
        expect(Number.isFinite(new Date(msg.enviado).getTime())).toBe(true);
      }
    }
  });
});
