export class CambioEstadoCompra {
  constructor({
    id,
    compraId,  // String id — evita referencia circular con Compra al serializar a JSON
    estado,    // EstadoCompra
    quien,     // Usuario (referencia directa) o string identificador del actor
    fechaHora = null,
    motivo = '',
  }) {
    this.id       = id || `cec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.compraId = compraId;
    this.estado   = estado;
    this.quien    = quien;
    this.fechaHora = fechaHora ? new Date(fechaHora) : new Date();
    this.motivo   = motivo;
  }
}
