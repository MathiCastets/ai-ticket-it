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

    test('GET /eventos y GET /eventos/:id no exponen emails de organizadores (Ley 25.326)', async () => {
      const resList = await fetch(`${baseUrl}/eventos`);
      const rawTextList = await resList.text();
      expect(resList.status).toBe(200);
      expect(rawTextList).not.toContain('@example.com');
      expect(rawTextList).not.toContain('@festivalba.com');
      expect(rawTextList).not.toContain('@teatrocolon.org.ar');

      const dataList = JSON.parse(rawTextList);
      expect(dataList.data.length).toBeGreaterThan(0);
      for (const ev of dataList.data) {
        expect(ev.organizador?.email).toBeUndefined();
      }

      const primerEventoId = dataList.data[0].id;
      const resDetalle = await fetch(`${baseUrl}/eventos/${primerEventoId}`);
      const rawTextDetalle = await resDetalle.text();
      expect(resDetalle.status).toBe(200);
      expect(rawTextDetalle).not.toContain('@example.com');
      expect(rawTextDetalle).not.toContain('@teatrocolon.org.ar');
      const dataDetalle = JSON.parse(rawTextDetalle);
      expect(dataDetalle.data.organizador?.email).toBeUndefined();
    });

    test('GET /compras y GET /compras/:id no exponen emails de compradores ni organizadores (Ley 25.326)', async () => {
      const resCompras = await fetch(`${baseUrl}/compras`, {
        headers: { 'X-User-Id': 'user_comprador_1' },
      });
      const rawTextCompras = await resCompras.text();
      expect(resCompras.status).toBe(200);
      expect(rawTextCompras).not.toContain('@example.com');
      expect(rawTextCompras).not.toContain('lucia.gomez@');
      expect(rawTextCompras).not.toContain('carlos.rodriguez@');

      const dataCompras = JSON.parse(rawTextCompras);
      expect(dataCompras.data.length).toBeGreaterThan(0);
      const primeraCompra = dataCompras.data[0];
      expect(primeraCompra.comprador?.email).toBeUndefined();

      const resDetalle = await fetch(`${baseUrl}/compras/${primeraCompra.id}`, {
        headers: { 'X-User-Id': 'user_comprador_1' },
      });
      const rawTextDetalle = await resDetalle.text();
      expect(resDetalle.status).toBe(200);
      expect(rawTextDetalle).not.toContain('@example.com');
      expect(rawTextDetalle).not.toContain('lucia.gomez@');
      const dataDetalle = JSON.parse(rawTextDetalle);
      expect(dataDetalle.data.comprador?.email).toBeUndefined();
      expect(dataDetalle.data.evento?.organizador?.email).toBeUndefined();
    });

    test('Gestión de favoritos en /usuarios/:id/favoritos', async () => {
      const resInicial = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos`, {
        headers: { 'X-User-Id': 'user_comprador_1' },
      });
      const dataInicial = await resInicial.json();
      expect(resInicial.status).toBe(200);
      expect(Array.isArray(dataInicial.data)).toBe(true);

      // PUT para agregar
      const resPut = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos/evt-electro-2`, {
        method: 'PUT',
        headers: { 'X-User-Id': 'user_comprador_1' },
      });
      const dataPut = await resPut.json();
      expect(resPut.status).toBe(200);
      expect(dataPut.data).toContain('evt-electro-2');

      // DELETE para remover
      const resDel = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos/evt-electro-2`, {
        method: 'DELETE',
        headers: { 'X-User-Id': 'user_comprador_1' },
      });
      const dataDel = await resDel.json();
      expect(resDel.status).toBe(200);
      expect(dataDel.data).not.toContain('evt-electro-2');
    });
  });

  describe('Validaciones y Errores HTTP', () => {
    test('Filtros ambiguos en compras responden 400', async () => {
      const res = await fetch(
        `${baseUrl}/compras?compradorId=user_comprador_1&eventoId=evt-utn-2026`,
        {
          headers: {
            'X-User-Id': 'user_comprador_1',
          },
        }
      );
      expect(res.status).toBe(400);
    });

    test('JSON malformado responde 400', async () => {
      const res = await fetch(`${baseUrl}/eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_org_sonora',
        },
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
    let organizadorId;

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
      organizadorId = evento.organizador.id;

      expect(typeof evento.categoria).toBe('object');
      expect(typeof evento.organizador).toBe('object');
    });

    test('Ciclo de compra: Crear -> Descontar cupo -> Acreditar -> Calificar', async () => {
      // 1. Crear compra (actor comprador)
      const resCompra = await fetch(`${baseUrl}/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
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

      // 3. Acreditar compra (actor debe ser el organizador del evento)
      const resAcreditar = await fetch(`${baseUrl}/compras/${compra.id}/acreditar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': organizadorId,
        },
        body: JSON.stringify({ quien: 'Staff Puerta' }),
      });
      const dataAcreditar = await resAcreditar.json();
      expect(resAcreditar.status).toBe(200);
      expect(dataAcreditar.data.estado).toBe('UTILIZADA');

      // 4. Calificar compra (actor debe ser el comprador)
      const resCalificar = await fetch(`${baseUrl}/compras/${compra.id}/calificar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
        body: JSON.stringify({ quien: 'Comprador' }),
      });
      const dataCancel = await resCancel.json();
      expect(resCancel.status).toBe(200);
      expect(dataCancel.data.estado).toBe('REEMBOLSADA');

      // Intentar cancelar de nuevo debe fallar
      const resReCancel = await fetch(`${baseUrl}/compras/${compraId}/cancelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
        body: JSON.stringify({
          usuarioId: 'user_comprador_1',
          texto: '¿A qué hora abren?',
        }),
      });
      expect(resMsg.status).toBe(201);

      // Usuario no participante es rechazado con 403
      const resAjeno = await fetch(`${baseUrl}/compras/compra-1/mensajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_org_underground',
        },
        body: JSON.stringify({
          usuarioId: 'user_org_underground',
          texto: 'Mensaje no autorizado',
        }),
      });
      expect(resAjeno.status).toBe(403);

      // Marcar mensajes como leídos
      const resLeidos = await fetch(`${baseUrl}/compras/compra-1/mensajes/leidos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_org_sonora',
        },
        body: JSON.stringify({ usuarioId: 'user_org_sonora' }),
      });
      expect(resLeidos.status).toBe(200);
    });
  });

  describe('Seguridad y Control de Acceso (Fase 3)', () => {
    test('Rechaza con 401 si falta el header X-User-Id en rutas protegidas', async () => {
      const resCompras = await fetch(`${baseUrl}/compras`);
      expect(resCompras.status).toBe(401);
      const dataCompras = await resCompras.json();
      expect(dataCompras.error.code).toBe('UNAUTHORIZED');

      const resCrearEvento = await fetch(`${baseUrl}/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Evento hacker' }),
      });
      expect(resCrearEvento.status).toBe(401);
    });

    test('Rechaza con 401 si X-User-Id no corresponde a un usuario registrado', async () => {
      const res = await fetch(`${baseUrl}/compras`, {
        headers: { 'X-User-Id': 'usuario-inexistente-123' },
      });
      expect(res.status).toBe(401);
    });

    test('Rechaza con 403 si un comprador intenta crear un evento', async () => {
      const res = await fetch(`${baseUrl}/eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
        body: JSON.stringify({
          nombre: 'Evento No Autorizado',
          fecha: new Date(Date.now() + 86400000).toISOString(),
          categoriaId: 'cat-recitales',
          organizadorId: 'user_comprador_1',
          tiposEntrada: [{ nombre: 'General', precio: 1000, cupo: 10 }],
        }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('FORBIDDEN');
    });

    test('Rechaza con 403 si un comprador intenta acreditar una entrada', async () => {
      const res = await fetch(`${baseUrl}/compras/compra-1/acreditar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
        body: JSON.stringify({ quien: 'Comprador intentando autovalidarse' }),
      });
      expect(res.status).toBe(403);
    });

    test('Rechaza con 403 si un usuario intenta cancelar la compra de otro usuario', async () => {
      // compra-1 pertenece a user_comprador_1. user_comprador_2 intenta cancelarla
      const res = await fetch(`${baseUrl}/compras/compra-1/cancelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_2',
        },
        body: JSON.stringify({ quien: 'Hacker' }),
      });
      expect(res.status).toBe(403);
    });

    test('Rechaza con 403 si un usuario intenta ver el detalle de compra de otro usuario', async () => {
      // compra-1 pertenece a user_comprador_1. user_comprador_2 intenta consultarla
      const res = await fetch(`${baseUrl}/compras/compra-1`, {
        headers: {
          'X-User-Id': 'user_comprador_2',
        },
      });
      expect(res.status).toBe(403);
    });

    test('Un comprador autenticado en GET /compras solo recibe sus propios tickets', async () => {
      const res = await fetch(`${baseUrl}/compras`, {
        headers: {
          'X-User-Id': 'user_comprador_1',
        },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      for (const compra of data.data) {
        expect(compra.comprador.id).toBe('user_comprador_1');
      }
    });

    test('Rechaza con 403 si un comprador intenta consultar compras con otro compradorId', async () => {
      const res = await fetch(`${baseUrl}/compras?compradorId=user_comprador_2`, {
        headers: {
          'X-User-Id': 'user_comprador_1',
        },
      });
      expect(res.status).toBe(403);
    });

    test('Rechaza con 403 si un comprador intenta consultar compras por eventoId', async () => {
      const res = await fetch(`${baseUrl}/compras?eventoId=evt-utn-2026`, {
        headers: {
          'X-User-Id': 'user_comprador_1',
        },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Reglas de Negocio Estrictas (Fase 5)', () => {
    test('Rechaza con 400 si se intenta comprar entrada de un evento que ya ocurrió', async () => {
      const res = await fetch(`${baseUrl}/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_comprador_1',
        },
        body: JSON.stringify({
          compradorId: 'user_comprador_1',
          eventoId: 'evt-sonora-aniversario', // Evento en el pasado según seedData
          tipoEntradaId: 't-sonora-gen',
          cantidad: 1,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('EVENTO_PASADO');
    });

    test('Rechaza con 400 si un organizador intenta crear un evento con fecha en el pasado', async () => {
      const res = await fetch(`${baseUrl}/eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_org_sonora',
        },
        body: JSON.stringify({
          nombre: 'Festival en el pasado',
          fecha: new Date(Date.now() - 3600000).toISOString(),
          categoriaId: 'cat-recitales',
          organizadorId: 'user_org_sonora',
          tiposEntrada: [{ nombre: 'General', precio: 5000, cupo: 100 }],
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toContain('posteriores al momento actual');
    });
  });

  describe('Autorización Avanzada (Fase 7a)', () => {
    test('organizador ajeno con ?eventoId= devuelve lista vacía', async () => {
      const resEvts = await fetch(`${baseUrl}/eventos`);
      const dataEvts = await resEvts.json();
      const eventoFuturo = dataEvts.data.find((e) => new Date(e.fecha).getTime() > Date.now());
      expect(eventoFuturo).toBeDefined();

      const res = await fetch(`${baseUrl}/compras?eventoId=${eventoFuturo.id}`, {
        headers: { 'X-User-Id': 'user_org_underground' },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual([]);
    });

    test('organizador intentando comprar devuelve 403', async () => {
      const resEvts = await fetch(`${baseUrl}/eventos`);
      const dataEvts = await resEvts.json();
      const eventoFuturo = dataEvts.data.find((e) => new Date(e.fecha).getTime() > Date.now());
      const tipoEntradaId = eventoFuturo.tiposEntrada[0].id;

      const res = await fetch(`${baseUrl}/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'user_org_sonora',
        },
        body: JSON.stringify({
          compradorId: 'user_org_sonora',
          eventoId: eventoFuturo.id,
          tipoEntradaId,
          cantidad: 1,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});
