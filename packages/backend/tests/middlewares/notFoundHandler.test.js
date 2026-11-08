import { describe, expect, jest, test } from '@jest/globals';
import { notFoundHandler } from '../../src/middlewares/notFoundHandler.js';

describe('notFoundHandler middleware', () => {
  test('responde 404 e identifica método y ruta desconocida', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    notFoundHandler({ method: 'PATCH', originalUrl: '/api/no-existe' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Ruta no encontrada: PATCH /api/no-existe',
        code: 'ROUTE_NOT_FOUND',
      },
    });
  });
});
