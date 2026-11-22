export class Categoria {
  constructor({ id, nombre, descripcion = '' }) {
    if (!nombre) {
      throw new Error('Categoria requiere nombre');
    }
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
  }
}
