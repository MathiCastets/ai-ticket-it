export class Mensaje {
  constructor({
    id,
    usuario,   // Usuario (referencia directa, según diagrama de clases)
    mensaje,   // String (nombre del campo según diagrama)
    enviado = null,
  }) {
    if (!mensaje || !String(mensaje).trim()) {
      throw new Error('Mensaje no puede estar vacío');
    }
    if (!usuario) throw new Error('Mensaje requiere un usuario (Usuario)');

    this.id      = id || `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.usuario = usuario;
    this.mensaje = String(mensaje).trim();
    this.enviado = enviado ? new Date(enviado) : new Date();
  }

  get fechaHoraFormateada() {
    return this.enviado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
