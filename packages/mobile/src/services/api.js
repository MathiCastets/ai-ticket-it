import { API_BASE_URL } from '../config/apiConfig';
import { Platform } from 'react-native';

/**
 * Cliente HTTP para interactuar con la API Express del backend.
 * Implementa timeout y manejo tipado de respuestas.
 */

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function agregarImagenes(formData, imagenes) {
  for (const [index, imagen] of imagenes.entries()) {
    const fileExtension = imagen.fileName?.split('.').pop()?.toLowerCase();
    const mimeType =
      imagen.mimeType ||
      ({
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      }[fileExtension] || 'image/jpeg');
    const extension = mimeType.split('/')[1] || 'jpg';
    const filename = imagen.fileName || `evento-${index + 1}.${extension}`;

    if (Platform.OS === 'web') {
      const file =
        imagen.file ||
        (await fetch(imagen.uri).then((response) => {
          if (!response.ok) throw new Error('No se pudo leer la imagen seleccionada.');
          return response.blob();
        }));
      formData.append('imagenes', file, filename);
    } else {
      formData.append('imagenes', {
        uri: imagen.uri,
        name: filename,
        type: mimeType,
      });
    }
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isMultipart =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  if (isMultipart) {
    delete config.headers['Content-Type'];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), isMultipart ? 60000 : 6000);

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error?.message || `Error HTTP ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.code = data?.error?.code;
      throw err;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const api = {
  // Health
  checkHealth: () => request('/health'),

  // Categorías
  getCategorias: () => request('/categorias'),

  // Eventos
  getEventos: ({ categoria, search, sortBy } = {}) => {
    const params = new URLSearchParams();
    if (categoria && categoria !== 'Todos') params.append('categoria', categoria);
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/eventos${queryString}`);
  },

  getEventoById: (id) => request(`/eventos/${id}`),

  // Favoritos
  getFavoritos: (usuarioId) => request(`/usuarios/${usuarioId}/favoritos`),

  agregarFavorito: (usuarioId, eventoId) =>
    request(`/usuarios/${usuarioId}/favoritos/${eventoId}`, {
      method: 'PUT',
    }),

  removerFavorito: (usuarioId, eventoId) =>
    request(`/usuarios/${usuarioId}/favoritos/${eventoId}`, {
      method: 'DELETE',
    }),

  crearEvento: async (eventoData, imagenes = []) => {
    if (imagenes.length === 0) {
      return request('/eventos', {
        method: 'POST',
        body: JSON.stringify(eventoData),
      });
    }

    const formData = new FormData();
    formData.append('evento', JSON.stringify(eventoData));
    await agregarImagenes(formData, imagenes);

    return request('/eventos', {
      method: 'POST',
      body: formData,
    });
  },
  actualizarEvento: async (eventoId, cambios, imagenes = []) => {
    if (imagenes.length === 0) {
      return request(`/eventos/${eventoId}`, {
        method: 'PUT',
        body: JSON.stringify(cambios),
      });
    }

    const formData = new FormData();
    formData.append('cambios', JSON.stringify(cambios));
    await agregarImagenes(formData, imagenes);
    return request(`/eventos/${eventoId}`, {
      method: 'PUT',
      body: formData,
    });
  },

  // Compras
  getCompras: ({ compradorId, eventoId } = {}) => {
    const params = new URLSearchParams();
    if (compradorId) params.append('compradorId', compradorId);
    if (eventoId) params.append('eventoId', eventoId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/compras${queryString}`);
  },

  getCompraById: (id) => request(`/compras/${id}`),

  crearCompra: ({ compradorId, eventoId, tipoEntradaId, cantidad }) =>
    request('/compras', {
      method: 'POST',
      body: JSON.stringify({ compradorId, eventoId, tipoEntradaId, cantidad }),
    }),

  cancelarCompra: (id, quien = 'Comprador') =>
    request(`/compras/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ quien }),
    }),

  marcarUtilizada: (id, quien = 'Acreditación en Puerta') =>
    request(`/compras/${id}/acreditar`, {
      method: 'POST',
      body: JSON.stringify({ quien }),
    }),

  calificarCompra: (id, { puntuacion, comentario }) =>
    request(`/compras/${id}/calificar`, {
      method: 'POST',
      body: JSON.stringify({ puntuacion, comentario }),
    }),

  // Mensajería vinculada a compra
  getMensajes: (compraId) => request(`/compras/${compraId}/mensajes`),

  enviarMensaje: (compraId, { usuarioId, texto }) =>
    request(`/compras/${compraId}/mensajes`, {
      method: 'POST',
      body: JSON.stringify({ usuarioId, texto }),
    }),
};
