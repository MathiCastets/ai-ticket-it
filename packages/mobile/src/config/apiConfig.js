export const BACKEND_PORT = 8000;
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL =
  configuredApiUrl?.replace(/\/+$/, '') ||
  `http://localhost:${BACKEND_PORT}/api`;

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const resolverImagen = (uri) => {
  if (typeof uri !== 'string' || !uri) return '';
  return uri.startsWith('/') ? `${API_ORIGIN}${uri}` : uri;
};

export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';
