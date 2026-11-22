import { describe, test, expect } from '@jest/globals';
import { Mensaje } from '../../src/domain/entities/Mensaje.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';

describe('Mensaje', () => {
  const usuario = new Usuario({
    id: 'user-1',
    nombre: 'Emisor',
    rol: 'comprador',
    email: 'emisor.secreto@example.com',
  });

  describe('construcción válida', () => {
    test('crea un mensaje con valores por defecto', () => {
      const msg = new Mensaje({ usuario, mensaje: 'Hola mundo' });

      expect(msg.id).toBeDefined();
      expect(msg.usuario).toBe(usuario);
      expect(msg.mensaje).toBe('Hola mundo');
      expect(msg.enviado).toBeInstanceOf(Date);
      expect(msg.leidoPor).toEqual([]);
    });

    test('preserva id, fecha y leidoPor provistos', () => {
      const fecha = new Date('2026-11-01T10:00:00Z');
      const msg = new Mensaje({
        id: 'msg-custom-1',
        usuario,
        mensaje: 'Consulta',
        enviado: fecha,
        leidoPor: ['user-2'],
      });

      expect(msg.id).toBe('msg-custom-1');
      expect(msg.enviado).toEqual(fecha);
      expect(msg.leidoPor).toEqual(['user-2']);
    });

    test('normaliza el mensaje y reinicia leidoPor cuando no recibe una lista', () => {
      const msg = new Mensaje({ usuario, mensaje: 42, enviado: null, leidoPor: 'user-2' });

      expect(msg.mensaje).toBe('42');
      expect(msg.leidoPor).toEqual([]);
      expect(msg.enviado).toBeInstanceOf(Date);
    });
  });

  describe('validaciones de construcción', () => {
    test('lanza error si el mensaje está vacío o solo contiene espacios', () => {
      expect(() => new Mensaje({ usuario, mensaje: '' })).toThrow('Mensaje no puede estar vacío');
      expect(() => new Mensaje({ usuario, mensaje: '   ' })).toThrow('Mensaje no puede estar vacío');
    });

    test('lanza error si no se provee usuario', () => {
      expect(() => new Mensaje({ mensaje: 'Sin usuario' })).toThrow('Mensaje requiere un usuario');
    });
  });

  describe('fechaHoraFormateada', () => {
    test('retorna string de hora y minuto', () => {
      const msg = new Mensaje({ usuario, mensaje: 'Test hora' });
      expect(typeof msg.fechaHoraFormateada).toBe('string');
      expect(msg.fechaHoraFormateada.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('toJSON y privacidad (Ley 25.326)', () => {
    test('toJSON no expone el email del usuario', () => {
      const msg = new Mensaje({ usuario, mensaje: 'Mensaje con datos sensibles' });
      const json = msg.toJSON();

      expect(json.id).toBe(msg.id);
      expect(json.mensaje).toBe('Mensaje con datos sensibles');
      expect(json.usuario.email).toBeUndefined();
      expect('email' in json.usuario).toBe(false);
    });

    test('JSON.stringify no contiene el email del usuario', () => {
      const msg = new Mensaje({ usuario, mensaje: 'Mensaje privado' });
      const str = JSON.stringify(msg);

      expect(str).not.toContain('emisor.secreto@example.com');
      expect(str).not.toContain('"email"');
    });

    test('serializa un usuario identificado por string sin inventar sus datos', () => {
      const msg = new Mensaje({ usuario: 'user-2', mensaje: 'Consulta' });

      expect(msg.toJSON()).toMatchObject({
        usuario: 'user-2',
        usuarioId: 'user-2',
        usuarioNombre: '',
      });
    });
  });
});
