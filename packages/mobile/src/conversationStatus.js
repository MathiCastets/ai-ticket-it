import { useEffect, useState } from 'react';

export const getConversationClosingAt = (compra) => {
  const fechaEvento = Date.parse(compra?.eventoFecha || compra?.evento?.fecha || '');
  if (!Number.isFinite(fechaEvento)) return null;

  const ultimoMensaje = (compra.mensajes || []).reduce((ultimaFecha, mensaje) => {
    const fechaMensaje = Date.parse(mensaje.enviado || '');
    return Number.isFinite(fechaMensaje) ? Math.max(ultimaFecha, fechaMensaje) : ultimaFecha;
  }, Number.NEGATIVE_INFINITY);

  return Math.max(fechaEvento, ultimoMensaje) + 48 * 60 * 60 * 1000;
};

export const isConversationClosed = (compra, ahora = Date.now()) => {
  const cierre = getConversationClosingAt(compra);
  return cierre !== null && ahora >= cierre;
};

export const useConversationStatusTime = (compras) => {
  const [ahora, setAhora] = useState(Date.now);
  const proximoCierre = compras
    .map(getConversationClosingAt)
    .filter((cierre) => cierre !== null && cierre > ahora)
    .reduce((proximo, cierre) => Math.min(proximo, cierre), Number.POSITIVE_INFINITY);

  useEffect(() => {
    if (!Number.isFinite(proximoCierre)) return undefined;

    const timeout = setTimeout(
      () => setAhora(Date.now()),
      Math.min(proximoCierre - ahora, 2_147_483_647)
    );

    return () => clearTimeout(timeout);
  }, [proximoCierre, ahora]);

  return ahora;
};
