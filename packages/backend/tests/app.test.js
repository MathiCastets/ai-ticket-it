import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../src/app.js';

describe('App HTTP Integration Tests', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Health Check', () => {
    test('GET /health responde status ok', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
    });
  });

  describe('Categorías', () => {
    test('GET /categorias responde lista no vacía', async () => {
      const res = await fetch(`${baseUrl}/categorias`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Usuarios y Privacidad', () => {
    test('GET /usuarios no expone campos sensibles como email', async () => {
      const res = await fetch(`${baseUrl}/usuarios`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);
      for (const usuario of data.data) {
        expect(usuario).not.toHaveProperty('email');
      }
    });

    test('Gestión de favoritos en /usuarios/:id/favoritos', async () => {
      const resInicial = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos`);
      const dataInicial = await resInicial.json();
      expect(resInicial.status).toBe(200);
      expect(Array.isArray(dataInicial.data)).toBe(true);

      // PUT para agregar
      const resPut = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos/evt-electro-2`, {
        method: 'PUT',
      });
      const dataPut = await resPut.json();
      expect(resPut.status).toBe(200);
      expect(dataPut.data).toContain('evt-electro-2');

      // DELETE para remover
      const resDel = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos/evt-electro-2`, {
        method: 'DELETE',
      });
      const dataDel = await resDel.json();
      expect(resDel.status).toBe(200);
      expect(dataDel.data).not.toContain('evt-electro-2');
    });
  });

  describe('Validaciones y Errores HTTP', () => {
    test('Filtros ambiguos en compras responden 400', async () => {
      const res = await fetch(
        `${baseUrl}/compras?compradorId=user_comprador_1&eventoId=evt-utn-2026`
      );
      expect(res.status).toBe(400);
    });

    test('JSON malformado responde 400', async () => {
      const res = await fetch(`${baseUrl}/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"nombre":',
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error.code).toBe('INVALID_JSON');
    });
  });

  describe('Flujo de Eventos y Compras', () => {
    let eventoId;
    let tipoEntradaId;
    let cupoInicial;

    test('GET /eventos lista eventos normalizados', async () => {
      const res = await fetch(`${baseUrl}/eventos`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.length).toBeGreaterThanOrEqual(1);

      const evento = data.data.find((e) => new Date(e.fecha).getTime() > Date.now());
      expect(evento).toBeDefined();
      eventoId = evento.id;
      tipoEntradaId = evento.tiposEntrada[0].id;
      cupoInicial = evento.tiposEntrada[0].disponibles;

      expect(typeof evento.categoria).toBe('object');
      expect(typeof evento.organizador).toBe('object');
    });

    test('Ciclo de compra: Crear -> Descontar cupo -> Acreditar -> Calificar', async () => {
      // 1. Crear compra
      const resCompra = await fetch(`${baseUrl}/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compradorId: 'user_comprador_1',
          eventoId,
          tipoEntradaId,
          cantidad: 1,
        }),
      });
      const dataCompra = await resCompra.json();
      expect(resCompra.status).toBe(201);
      const compra = dataCompra.data;
      expect(compra.estado).toBe('CONFIRMADA');

      // 2. Verificar cupo descontado
      const resEvt = await fetch(`${baseUrl}/eventos/${eventoId}`);
      const dataEvt = await resEvt.json();
      const tipo = dataEvt.data.tiposEntrada.find((t) => t.id === tipoEntradaId);
      expect(tipo.disponibles).toBe(cupoInicial - 1);

      // 3. Acreditar compra
      const resAcreditar = await fetch(`${baseUrl}/compras/${compra.id}/acreditar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quien: 'Staff Puerta' }),
      });
      const dataAcreditar = await resAcreditar.json();
      expect(resAcreditar.status).toBe(200);
      expect(dataAcreditar.data.estado).toBe('UTILIZADA');

      // 4. Calificar compra
      const resCalificar = await fetch(`${baseUrl}/compras/${compra.id}/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puntuacion: 5,
          comentario: 'Excelente festival',
        }),
      });
      expect(resCalificar.status).toBe(200);
    });

    test('Cancelar compra reembolsa y restituye cupo', async () => {
      // Crear nueva compra
      const resCompra = await fetch(`${baseUrl}/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compradorId: 'user_comprador_1',
          eventoId,
          tipoEntradaId,
          cantidad: 1,
        }),
      });
      const dataCompra = await resCompra.json();
      const compraId = dataCompra.data.id;

      // Cancelar compra
      const resCancel = await fetch(`${baseUrl}/compras/${compraId}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quien: 'Comprador' }),
      });
      const dataCancel = await resCancel.json();
      expect(resCancel.status).toBe(200);
      expect(dataCancel.data.estado).toBe('REEMBOLSADA');

      // Intentar cancelar de nuevo debe fallar
      const resReCancel = await fetch(`${baseUrl}/compras/${compraId}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quien: 'Comprador' }),
      });
      expect(resReCancel.status).toBe(400);
    });
  });

  describe('Mensajería', () => {
    test('Control de acceso en mensajería de compras', async () => {
      // Comprador 1 envía mensaje en su compra
      const resMsg = await fetch(`${baseUrl}/compras/compra-1/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: 'user_comprador_1',
          texto: '¿A qué hora abren?',
        }),
      });
      expect(resMsg.status).toBe(201);

      // Usuario no participante es rechazado con 400
      const resAjeno = await fetch(`${baseUrl}/compras/compra-1/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: 'user_org_underground',
          texto: 'Mensaje no autorizado',
        }),
      });
      expect(resAjeno.status).toBe(400);

      // Marcar mensajes como leídos
      const resLeidos = await fetch(`${baseUrl}/compras/compra-1/mensajes/leidos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: 'user_org_sonora' }),
      });
      expect(resLeidos.status).toBe(200);
    });
  });
});
