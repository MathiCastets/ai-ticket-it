import assert from 'node:assert/strict';
import { createApp } from './src/app.js';
import { CompraService } from './src/services/CompraService.js';
import { createSeedData } from './src/repositories/seedData.js';
import { CompraRepository } from './src/repositories/inMemory/CompraRepository.js';
import { EventoRepository } from './src/repositories/inMemory/EventoRepository.js';
import { UsuarioRepository } from './src/repositories/inMemory/UsuarioRepository.js';
import { MensajeService } from './src/services/MensajeService.js';
import { EventoService } from './src/services/EventoService.js';

async function validarMutacionesAtomicas() {
  const purchaseSeed = createSeedData();
  const purchaseBaseRepository = new CompraRepository(purchaseSeed.compras);
  const eventRepository = new EventoRepository(purchaseSeed.eventos);
  const usuarioRepository = new UsuarioRepository(purchaseSeed.usuarios);
  const disponiblesIniciales = purchaseSeed.eventos[0].tiposEntrada[0].disponibles;
  const comprasIniciales = purchaseBaseRepository.compras.length;
  const failingPurchaseRepository = {
    findById: (...args) => purchaseBaseRepository.findById(...args),
    save: async (compra) => {
      await purchaseBaseRepository.save(compra);
      throw new Error('Fallo de persistencia de compra inyectado');
    },
    delete: (...args) => purchaseBaseRepository.delete(...args),
  };
  const failedPurchaseService = new CompraService(
    failingPurchaseRepository,
    eventRepository,
    usuarioRepository
  );

  await assert.rejects(
    failedPurchaseService.realizarCompra({
      compradorId: 'user_comprador_1',
      eventoId: 'evt-utn-2026',
      tipoEntradaId: 'te-gen-1',
      cantidad: 1,
    }),
    /Fallo de persistencia de compra inyectado/
  );
  assert.equal(purchaseSeed.eventos[0].tiposEntrada[0].disponibles, disponiblesIniciales);
  assert.equal(purchaseBaseRepository.compras.length, comprasIniciales);

  const eventFailureSeed = createSeedData();
  const eventBaseRepository = new EventoRepository(eventFailureSeed.eventos);
  const eventCompraRepository = new CompraRepository(eventFailureSeed.compras);
  const eventUsuarioRepository = new UsuarioRepository(eventFailureSeed.usuarios);
  const eventStockBefore = eventFailureSeed.eventos[0].tiposEntrada[0].disponibles;
  const eventPurchaseCountBefore = eventCompraRepository.compras.length;
  let failEventSave = true;
  const failingEventRepository = {
    findById: (...args) => eventBaseRepository.findById(...args),
    save: async (evento) => {
      await eventBaseRepository.save(evento);
      if (failEventSave) {
        failEventSave = false;
        throw new Error('Fallo de persistencia del evento inyectado');
      }
      return evento;
    },
  };
  const failedEventService = new CompraService(
    eventCompraRepository,
    failingEventRepository,
    eventUsuarioRepository
  );
  await assert.rejects(
    failedEventService.realizarCompra({
      compradorId: 'user_comprador_1',
      eventoId: 'evt-utn-2026',
      tipoEntradaId: 'te-gen-1',
      cantidad: 1,
    }),
    /Fallo de persistencia del evento inyectado/
  );
  assert.equal(eventFailureSeed.eventos[0].tiposEntrada[0].disponibles, eventStockBefore);
  assert.equal(eventCompraRepository.compras.length, eventPurchaseCountBefore);

  const cancellationSeed = createSeedData();
  const cancellationEventoRepository = new EventoRepository(cancellationSeed.eventos);
  const cancellationUsuarioRepository = new UsuarioRepository(cancellationSeed.usuarios);
  const cancellationCompraBase = new CompraRepository(cancellationSeed.compras);
  let failCancellationSave = true;
  const failingCancellationRepository = {
    findById: (...args) => cancellationCompraBase.findById(...args),
    save: async (compra) => {
      await cancellationCompraBase.save(compra);
      if (failCancellationSave) {
        failCancellationSave = false;
        throw new Error('Fallo de persistencia de cancelación inyectado');
      }
      return compra;
    },
    delete: (...args) => cancellationCompraBase.delete(...args),
  };
  const cancellationService = new CompraService(
    failingCancellationRepository,
    cancellationEventoRepository,
    cancellationUsuarioRepository
  );
  const purchaseToCancel = await cancellationCompraBase.findById('compra-2');
  const cancellationEvent = await cancellationEventoRepository.findById('evt-electro-2');
  const cancellationStockBefore = cancellationEvent.tiposEntrada[0].disponibles;
  const cancellationHistoryBefore = purchaseToCancel.historialCambios.length;

  await assert.rejects(
    cancellationService.cancelarCompra('compra-2'),
    /Fallo de persistencia de cancelación inyectado/
  );
  assert.equal(purchaseToCancel.estado, 'PENDIENTE');
  assert.equal(purchaseToCancel.historialCambios.length, cancellationHistoryBefore);
  assert.equal(cancellationEvent.tiposEntrada[0].disponibles, cancellationStockBefore);

  const eventCancellationSeed = createSeedData();
  const eventCancellationPurchaseRepository = new CompraRepository(eventCancellationSeed.compras);
  const eventCancellationBaseRepository = new EventoRepository(eventCancellationSeed.eventos);
  const eventCancellationUsuarioRepository = new UsuarioRepository(eventCancellationSeed.usuarios);
  const eventCancellationCompra = await eventCancellationPurchaseRepository.findById('compra-2');
  const eventCancellationEvent = await eventCancellationBaseRepository.findById('evt-electro-2');
  const eventCancellationStockBefore = eventCancellationEvent.tiposEntrada[0].disponibles;
  let failEventCancellationSave = true;
  const eventCancellationRepository = {
    findById: (...args) => eventCancellationBaseRepository.findById(...args),
    save: async (evento) => {
      await eventCancellationBaseRepository.save(evento);
      if (failEventCancellationSave) {
        failEventCancellationSave = false;
        throw new Error('Fallo de guardado del evento al cancelar');
      }
      return evento;
    },
  };
  const eventCancellationService = new CompraService(
    eventCancellationPurchaseRepository,
    eventCancellationRepository,
    eventCancellationUsuarioRepository
  );
  await assert.rejects(
    eventCancellationService.cancelarCompra('compra-2'),
    /Fallo de guardado del evento al cancelar/
  );
  assert.equal(eventCancellationCompra.estado, 'PENDIENTE');
  assert.equal(eventCancellationEvent.tiposEntrada[0].disponibles, eventCancellationStockBefore);

  const concurrentSeed = createSeedData();
  const concurrentEventoRepository = new EventoRepository(concurrentSeed.eventos);
  const concurrentCompraRepository = new CompraRepository(concurrentSeed.compras);
  const concurrentUsuarioRepository = new UsuarioRepository(concurrentSeed.usuarios);
  const concurrentEvent = await concurrentEventoRepository.findById('evt-utn-2026');
  concurrentEvent.tiposEntrada[0].disponibles = 1;
  const concurrentService = new CompraService(
    concurrentCompraRepository,
    concurrentEventoRepository,
    concurrentUsuarioRepository
  );
  const concurrentResults = await Promise.allSettled([
    concurrentService.realizarCompra({
      compradorId: 'user_comprador_1',
      eventoId: concurrentEvent.id,
      tipoEntradaId: 'te-gen-1',
      cantidad: 1,
    }),
    concurrentService.realizarCompra({
      compradorId: 'user_comprador_1',
      eventoId: concurrentEvent.id,
      tipoEntradaId: 'te-gen-1',
      cantidad: 1,
    }),
  ]);
  assert.equal(concurrentResults.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(concurrentResults.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(concurrentEvent.tiposEntrada[0].disponibles, 0);

  const messageSeed = createSeedData();
  const messagePurchaseRepository = new CompraRepository(messageSeed.compras);
  const failingMessageRepository = {
    findById: (...args) => messagePurchaseRepository.findById(...args),
    save: async (compra) => {
      await messagePurchaseRepository.save(compra);
      throw new Error('Fallo de persistencia del mensaje inyectado');
    },
  };
  const messageService = new MensajeService(
    failingMessageRepository,
    new UsuarioRepository(messageSeed.usuarios)
  );
  const originalMessageCount = messageSeed.compras[0].mensajes.length;
  await assert.rejects(
    messageService.enviarMensaje('compra-1', {
      usuarioId: 'user_comprador_1',
      texto: 'Mensaje que no debe quedar guardado',
    }),
    /Fallo de persistencia del mensaje inyectado/
  );
  assert.equal(messageSeed.compras[0].mensajes.length, originalMessageCount);

  const lookupFailure = new Error('Fallo de lectura del repositorio');
  const failingLookupService = new CompraService(
    { findById: async () => { throw lookupFailure; } },
    new EventoRepository([]),
    new UsuarioRepository([])
  );
  await assert.rejects(
    failingLookupService.obtenerPorId('compra-no-encontrada'),
    (error) => error === lookupFailure
  );
  const failingEventLookupService = new EventoService(
    { findById: async () => { throw lookupFailure; } },
    new UsuarioRepository([]),
    { findById: async () => null, findByNombre: async () => null }
  );
  await assert.rejects(
    failingEventLookupService.obtenerPorId('evento-no-encontrado'),
    (error) => error === lookupFailure
  );

  const sharedEventoRepository = new EventoRepository();
  const sharedCompraRepository = new CompraRepository();
  const sharedCompra = await sharedCompraRepository.findById('compra-1');
  const sharedEvento = await sharedEventoRepository.findById('evt-utn-2026');
  assert.strictEqual(sharedCompra.evento, sharedEvento);
  assert.strictEqual(
    sharedCompra.tipoEntrada,
    sharedEvento.obtenerTipoEntrada(sharedCompra.tipoEntrada.id)
  );
  console.log('✓ Transacciones compensatorias, concurrencia y semillas compartidas OK');
}

async function runTests() {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log(`[TEST] Servidor de prueba corriendo en ${baseUrl}`);

  try {
    await validarMutacionesAtomicas();

    // 1. Health
    let res = await fetch(`${baseUrl}/health`);
    let data = await res.json();
    assert.equal(res.status, 200, 'Health check status should be 200');
    assert.equal(data.status, 'ok', 'Health status should be ok');
    console.log('✓ Health check OK');

    // 2. Categorias
    res = await fetch(`${baseUrl}/categorias`);
    data = await res.json();
    assert.equal(res.status, 200, 'Categorias status should be 200');
    assert.ok(Array.isArray(data.data) && data.data.length > 0, 'Categorias debería tener datos');
    console.log(`✓ Categorias OK (${data.data.length} encontradas)`);

    // 3. Eventos — verificar normalización (categoria y organizador son objetos)
    res = await fetch(`${baseUrl}/eventos`);
    data = await res.json();
    assert.equal(res.status, 200, 'Eventos status should be 200');
    assert.ok(data.data.length >= 3, 'Debe haber al menos 3 eventos iniciales');
    const firstEvent = data.data[0];
    assert.equal(typeof firstEvent.categoria, 'object', 'categoria debe ser un objeto (Categoria), no un string');
    assert.equal(typeof firstEvent.organizador, 'object', 'organizador debe ser un objeto (Usuario), no un string');
    console.log(`✓ Eventos OK (${data.data.length} eventos, primero: "${firstEvent.nombre}")`);
    console.log(`  ✓ categoria normalizada: { id: "${firstEvent.categoria.id}", nombre: "${firstEvent.categoria.nombre}" }`);
    console.log(`  ✓ organizador normalizado: { id: "${firstEvent.organizador.id}", nombre: "${firstEvent.organizador.nombre}" }`);

    res = await fetch(`${baseUrl}/compras?compradorId=user_comprador_2`);
    data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(
      data.data.length >= 2 && data.data.every((compra) => compra.comprador.id === 'user_comprador_2'),
      'El perfil de Lucía debe tener sus propias compras de demostración'
    );

    // Los favoritos se persisten en el usuario y las actualizaciones PUT son idempotentes.
    res = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos`);
    data = await res.json();
    assert.deepEqual(data.data, ['evt-utn-2026']);

    res = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos/evt-electro-2`, {
      method: 'PUT',
    });
    data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.includes('evt-electro-2'));

    res = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos/evt-electro-2`, {
      method: 'PUT',
    });
    data = await res.json();
    assert.equal(data.data.filter((id) => id === 'evt-electro-2').length, 1);

    res = await fetch(`${baseUrl}/usuarios/user_comprador_1/favoritos/evt-electro-2`, {
      method: 'DELETE',
    });
    data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(!data.data.includes('evt-electro-2'));
    console.log('✓ Favoritos persistidos por usuario y actualizaciones idempotentes');

    res = await fetch(`${baseUrl}/compras?compradorId=user_comprador_1&eventoId=evt-utn-2026`);
    data = await res.json();
    assert.equal(res.status, 400, 'No debe aceptar filtros de compra ambiguos');

    res = await fetch(`${baseUrl}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"nombre":',
    });
    data = await res.json();
    assert.equal(res.status, 400, 'JSON malformado debe ser un error de cliente');
    assert.equal(data.error.code, 'INVALID_JSON');
    console.log('✓ JSON inválido y filtros ambiguos responden 400');

    // 4. Detalle de evento
    res = await fetch(`${baseUrl}/eventos/${firstEvent.id}`);
    data = await res.json();
    assert.equal(res.status, 200, 'Detalle evento status should be 200');
    const tipoEntrada = data.data.tiposEntrada[0];
    const initialDisponibles = tipoEntrada.disponibles;
    console.log(`✓ Detalle evento OK. Tipo entrada: "${tipoEntrada.nombre}", Disponibles: ${initialDisponibles}`);

    // 5. Crear Compra — verificar normalización de la respuesta
    res = await fetch(`${baseUrl}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compradorId: 'user_comprador_1',
        eventoId: firstEvent.id,
        tipoEntradaId: tipoEntrada.id,
        cantidad: 2,
      }),
    });
    data = await res.json();
    assert.equal(res.status, 201, `Crear compra should return 201, got ${res.status}: ${JSON.stringify(data)}`);
    const compra = data.data;
    assert.equal(compra.estado, 'CONFIRMADA', 'Compra should be CONFIRMADA');
    assert.equal(typeof compra.comprador, 'object', 'compra.comprador debe ser un objeto (Usuario)');
    assert.equal(typeof compra.evento, 'object', 'compra.evento debe ser un objeto (Evento)');
    assert.equal(typeof compra.tipoEntrada, 'object', 'compra.tipoEntrada debe ser un objeto (TipoEntrada)');
    console.log(`✓ Crear compra OK (Id: ${compra.id}, Total: $${compra.total})`);
    console.log(`  ✓ comprador normalizado: { id: "${compra.comprador.id}", nombre: "${compra.comprador.nombre}" }`);
    console.log(`  ✓ evento normalizado: { id: "${compra.evento.id}", nombre: "${compra.evento.nombre}" }`);
    console.log(`  ✓ tipoEntrada normalizado: { id: "${compra.tipoEntrada.id}", nombre: "${compra.tipoEntrada.nombre}" }`);

    // Las cantidades de entradas deben ser enteras positivas.
    for (const cantidad of [1.5, 0, -1, '2', null]) {
      res = await fetch(`${baseUrl}/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compradorId: 'user_comprador_1',
          eventoId: firstEvent.id,
          tipoEntradaId: tipoEntrada.id,
          cantidad,
        }),
      });
      data = await res.json();
      assert.equal(res.status, 400, `La cantidad inválida ${cantidad} debe rechazarse`);
      assert.equal(data.error.code, 'VALIDATION_ERROR');
    }
    console.log('✓ Cantidades inválidas rechazadas');

    // Verificar que el cupo disminuyó
    res = await fetch(`${baseUrl}/eventos/${firstEvent.id}`);
    data = await res.json();
    const updatedTipo = data.data.tiposEntrada.find((t) => t.id === tipoEntrada.id);
    assert.equal(updatedTipo.disponibles, initialDisponibles - 2, 'Disponibles should decrease by 2');
    console.log(`✓ Cupo disminuyó correctamente (${initialDisponibles} -> ${updatedTipo.disponibles})`);

    // 6. Cancelar Compra
    res = await fetch(`${baseUrl}/compras/${compra.id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quien: 'Comprador' }),
    });
    data = await res.json();
    assert.equal(res.status, 200, 'Cancelar compra should return 200');
    assert.equal(data.data.estado, 'REEMBOLSADA', 'Compra state should be REEMBOLSADA');
    console.log(`✓ Cancelar compra OK. Estado: ${data.data.estado}`);

    res = await fetch(`${baseUrl}/compras/${compra.id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quien: 'Comprador' }),
    });
    assert.equal(res.status, 400, 'No debe permitir reembolsar dos veces una misma compra');

    // Verificar cupo restaurado
    res = await fetch(`${baseUrl}/eventos/${firstEvent.id}`);
    data = await res.json();
    const restoredTipo = data.data.tiposEntrada.find((t) => t.id === tipoEntrada.id);
    assert.equal(restoredTipo.disponibles, initialDisponibles, 'Disponibles should be restored');
    console.log(`✓ Cupo restaurado correctamente (${restoredTipo.disponibles})`);

    // 7. Nueva compra → acreditar → calificar
    res = await fetch(`${baseUrl}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compradorId: 'user_comprador_1',
        eventoId: firstEvent.id,
        tipoEntradaId: tipoEntrada.id,
        cantidad: 1,
      }),
    });
    data = await res.json();
    const compra2 = data.data;

    res = await fetch(`${baseUrl}/compras/${compra2.id}/acreditar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quien: 'Staff Puerta Norte' }),
    });
    data = await res.json();
    assert.ok(res.status === 200 && data.data.estado === 'UTILIZADA', 'State should be UTILIZADA');
    console.log(`✓ Acreditación OK. Estado: ${data.data.estado}`);

    // Intentar cancelar UTILIZADA — debe rechazarse
    res = await fetch(`${baseUrl}/compras/${compra2.id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quien: 'Comprador' }),
    });
    assert.ok(res.status === 400 || res.status === 409, `Debe rechazar con 400/409, got ${res.status}`);
    data = await res.json();
    console.log(`✓ Rechazo de cancelación inválida OK (${data.error?.message})`);

    // Calificar
    res = await fetch(`${baseUrl}/compras/${compra2.id}/calificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puntuacion: 5, comentario: 'Increíble organización y sonido espectacular!' }),
    });
    data = await res.json();
    assert.equal(res.status, 200, 'Calificar status should be 200');
    assert.equal(data.data.reseniaRealizada, true, 'reseniaRealizada should be true');
    // Verificar que reseña tiene objetos normalizados
    res = await fetch(`${baseUrl}/eventos/${firstEvent.id}`);
    data = await res.json();
    const resenia = data.data.resenias?.[0];
    assert.ok(resenia && typeof resenia.comprador === 'object', 'resenia.comprador debe ser objeto (Usuario)');
    assert.ok(resenia && typeof resenia.eventoId === 'string', 'resenia.eventoId debe ser string (evita referencia circular)');
    console.log(`✓ Calificación OK. Reseña: comprador.id="${resenia?.comprador?.id}", eventoId="${resenia?.eventoId}"`);

    // La ruta alternativa también exige una compra utilizada del mismo evento.
    res = await fetch(`${baseUrl}/eventos/${firstEvent.id}/resenias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compraId: compra2.id, puntuacion: 4, detalle: 'Muy buen evento.' }),
    });
    data = await res.json();
    assert.equal(res.status, 400, 'No debe permitir calificar dos veces la misma compra');

    res = await fetch(`${baseUrl}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compradorId: 'user_comprador_1',
        eventoId: firstEvent.id,
        tipoEntradaId: tipoEntrada.id,
        cantidad: 1,
      }),
    });
    data = await res.json();
    const compra3 = data.data;
    res = await fetch(`${baseUrl}/compras/${compra3.id}/acreditar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quien: 'Staff Puerta Norte' }),
    });
    assert.equal(res.status, 200, 'La tercera compra debe acreditarse para probar la ruta alternativa');

    res = await fetch(`${baseUrl}/eventos/evt-electro-2/resenias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compraId: compra3.id, puntuacion: 4, detalle: 'Muy buen evento.' }),
    });
    assert.equal(res.status, 400, 'La compra debe pertenecer al evento calificado');

    res = await fetch(`${baseUrl}/eventos/${firstEvent.id}/resenias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compraId: compra3.id, puntuacion: 6, detalle: 'Muy buen evento.' }),
    });
    assert.equal(res.status, 400, 'La puntuación debe estar dentro del rango de 1 a 5');

    res = await fetch(`${baseUrl}/eventos/${firstEvent.id}/resenias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compraId: compra3.id, puntuacion: 4, detalle: 'Muy buen evento.' }),
    });
    data = await res.json();
    assert.equal(res.status, 201, `La ruta de reseñas debe responder 201: ${JSON.stringify(data)}`);
    assert.equal(data.data.eventoId, firstEvent.id);
    assert.equal(data.data.puntuacion, 4);
    console.log('✓ Ruta de reseñas de evento OK y valida elegibilidad');

    // 8. Mensajería — usuario como objeto
    res = await fetch(`${baseUrl}/compras/${compra2.id}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuarioId: 'user_org_underground',
        texto: 'No debería poder participar en un chat ajeno.',
      }),
    });
    data = await res.json();
    assert.equal(res.status, 400, 'Un usuario ajeno a la compra no debe poder enviar mensajes');
    assert.equal(data.error.code, 'MENSAJERO_NO_AUTORIZADO');

    res = await fetch(`${baseUrl}/compras/${compra2.id}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuarioId: 'user_comprador_1',
        texto: 'Hola, ¿a qué hora abren las puertas?',
      }),
    });
    data = await res.json();
    assert.equal(res.status, 201, 'Enviar mensaje status should be 201');
    assert.equal(typeof data.data.usuario, 'object', 'mensaje.usuario debe ser objeto (Usuario)');
    assert.ok(data.data.mensaje !== undefined, 'mensaje.mensaje debe existir (según diagrama)');
    console.log(`✓ Enviar mensaje OK. usuario.id="${data.data.usuario?.id}", mensaje="${data.data.mensaje}"`);

    res = await fetch(`${baseUrl}/compras/${compra2.id}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId: 'user_comprador_1', texto: 42 }),
    });
    assert.equal(res.status, 400, 'El texto no string debe rechazarse sin generar un 500');

    res = await fetch(`${baseUrl}/compras/${compra2.id}/mensajes`);
    data = await res.json();
    assert.ok(data.data.length >= 1, 'Debe haber al menos 1 mensaje');
    console.log(`✓ Historial de mensajes OK (${data.data.length} mensajes)`);

    // La validación de creación debe detectar fechas inválidas y categorías inexistentes.
    const invalidEvent = {
      nombre: 'Evento inválido',
      fecha: 'no-es-una-fecha',
      categoria: 'Recitales',
      organizadorId: 'user_org_sonora',
      tiposEntrada: [{ nombre: 'General', precio: 1000, cupo: 10 }],
    };
    res = await fetch(`${baseUrl}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEvent),
    });
    assert.equal(res.status, 400, 'La fecha inválida debe rechazarse');

    invalidEvent.fecha = '2026-11-20T22:00:00.000Z';
    invalidEvent.categoria = 'Categoría inexistente';
    res = await fetch(`${baseUrl}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEvent),
    });
    assert.equal(res.status, 404, 'La categoría inexistente debe rechazarse');

    invalidEvent.categoria = 'Recitales';
    invalidEvent.organizadorId = 'user_comprador_1';
    res = await fetch(`${baseUrl}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEvent),
    });
    assert.equal(res.status, 400, 'Un usuario comprador no puede publicar como organizador');

    // Crear nuevo Evento con organizadorId
    res = await fetch(`${baseUrl}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: firstEvent.id,
        nombre: 'Synthwave Neon Night 2026',
        descripcion: 'Una noche retrofuturista con los mejores artistas de synthwave.',
        categoria: 'Recitales',
        organizadorId: 'user_org_sonora',
        fecha: '2026-11-20T22:00:00.000Z',
        fechaTexto: '20 de Noviembre 2026 • 22:00 hs',
        apertura: '21:00 hs',
        ubicacion: 'Niceto Club, Palermo, CABA',
        imagen: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
        tiposEntrada: [
          { nombre: 'General Early Bird', precio: 15000, cupo: 100 },
          { nombre: 'VIP Backstage Pass', precio: 32000, cupo: 30 },
        ],
      }),
    });
    data = await res.json();
    assert.equal(res.status, 201, `Crear evento should return 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.notEqual(data.data.id, firstEvent.id, 'El backend debe asignar ids de evento, no confiar en el cliente');
    assert.equal(typeof data.data.organizador, 'object', 'evento.organizador debe ser objeto (Usuario)');
    console.log(`✓ Crear evento OK (${data.data.id}). organizador normalizado: "${data.data.organizador?.nombre}"`);

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS TESTS DE INTEGRACIÓN PASARON EXITOSAMENTE!');
    console.log('   Entidades normalizadas — sin campos denormalizados.');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Error en test:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
