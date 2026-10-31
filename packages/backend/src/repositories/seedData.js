import { Usuario } from '../domain/entities/Usuario.js';
import { Categoria } from '../domain/entities/Categoria.js';
import { TipoEntrada } from '../domain/entities/TipoEntrada.js';
import { Evento } from '../domain/entities/Evento.js';
import { Compra } from '../domain/entities/Compra.js';
import { Mensaje } from '../domain/entities/Mensaje.js';
import { EstadoCompra } from '../domain/enums/EstadoCompra.js';

export function createSeedData() {
  // 1. Usuarios
  const compradorMathi = new Usuario({
    id: 'user_comprador_1',
    nombre: 'Mathi',
    apellido: 'Castets',
    rol: 'comprador',
    favoritos: ['evt-utn-2026'],
    email: 'mathi@utn.edu.ar',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  });

  const compradoraLucia = new Usuario({
    id: 'user_comprador_2',
    nombre: 'Lucía',
    apellido: 'Fernández',
    rol: 'comprador',
    email: 'lucia@utn.edu.ar',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=80',
  });

  const orgSonora = new Usuario({
    id: 'user_org_sonora',
    nombre: 'Producciones Sonora',
    apellido: '(Oficial)',
    rol: 'organizador',
    email: 'contacto@sonora.com',
    avatar: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=200&q=80',
  });

  const orgUnderground = new Usuario({
    id: 'user_org_underground',
    nombre: 'Club Underground',
    apellido: '',
    rol: 'organizador',
    email: 'info@underground.com.ar',
    avatar: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=200&q=80',
  });

  const orgTeatros = new Usuario({
    id: 'user_org_teatros',
    nombre: 'Teatros Porteños',
    apellido: '',
    rol: 'organizador',
    email: 'entradas@teatrosp.com.ar',
    avatar: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=200&q=80',
  });

  const orgTech = new Usuario({
    id: 'user_org_tech',
    nombre: 'Tech Community BA',
    apellido: '',
    rol: 'organizador',
    email: 'hola@techcommunityba.org',
    avatar: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=200&q=80',
  });

  const usuarios = [
    compradorMathi,
    compradoraLucia,
    orgSonora,
    orgUnderground,
    orgTeatros,
    orgTech,
  ];

  // 2. Categorías
  const catRecitales    = new Categoria({ id: 'cat-recitales',    nombre: 'Recitales',    descripcion: 'Conciertos y música en vivo' });
  const catFestivales   = new Categoria({ id: 'cat-festivales',   nombre: 'Festivales',   descripcion: 'Festivales masivos y multiescenario' });
  const catTeatro       = new Categoria({ id: 'cat-teatro',       nombre: 'Teatro',       descripcion: 'Obras teatrales, comedia y artes escénicas' });
  const catConferencias = new Categoria({ id: 'cat-conferencias', nombre: 'Conferencias', descripcion: 'Charlas magistrales y tecnología' });
  const catDeportes     = new Categoria({ id: 'cat-deportes',     nombre: 'Deportes',     descripcion: 'Eventos deportivos y competencias' });

  const categorias = [catRecitales, catFestivales, catTeatro, catConferencias, catDeportes];

  // 3. Tipos de entrada (se construyen primero para poder referenciarlos en Compra)
  const teGen1      = new TipoEntrada({ id: 'te-gen-1',          nombre: 'General',                   descripcion: 'Acceso a campo general y sector gastronómico',           precio: 15000, cupo: 500, disponibles: 142 });
  const teVip1      = new TipoEntrada({ id: 'te-vip-1',          nombre: 'Campo VIP',                 descripcion: 'Acceso preferencial frente al escenario + consumición',  precio: 28000, cupo: 150, disponibles: 18  });
  const teLounge1   = new TipoEntrada({ id: 'te-lounge-1',       nombre: 'Experiencia Sonora Lounge', descripcion: 'Terraza exclusiva elevada con barra libre y catering',   precio: 45000, cupo: 40,  disponibles: 4   });

  const teUnderGen  = new TipoEntrada({ id: 'te-under-gen',      nombre: 'Entrada General',           descripcion: 'Acceso a pista principal',                               precio: 8500,  cupo: 300, disponibles: 85  });
  const teUnderVip  = new TipoEntrada({ id: 'te-under-vip',      nombre: 'VIP Balcón',                descripcion: 'Vista panorámica y barra exclusiva',                     precio: 16000, cupo: 60,  disponibles: 12  });

  const teTeatroPlatea  = new TipoEntrada({ id: 'te-teatro-platea',  nombre: 'Platea Baja', descripcion: 'Fila 1 a 10 central',                  precio: 12000, cupo: 180, disponibles: 24  });
  const teTeatroPullman = new TipoEntrada({ id: 'te-teatro-pullman', nombre: 'Pullman',     descripcion: 'Primer piso con excelente visibilidad', precio: 9500,  cupo: 120, disponibles: 40  });

  const teConfPass  = new TipoEntrada({ id: 'te-conf-pass', nombre: 'Pase General', descripcion: 'Acceso a todas las charlas y coffee breaks', precio: 6000, cupo: 400, disponibles: 110 });

  // 4. Eventos — organizador y categoria como objetos referenciados
  const evento1 = new Evento({
    id: 'evt-utn-2026',
    nombre: 'Festival de Música UTN 2026',
    destacado: true,
    fecha: '2026-11-10T20:00:00',
    fechaTexto: '10 de Noviembre 2026 • 20:00 hs',
    apertura: '18:30 hs',
    ubicacion: 'Estadio Obras Sanitarias / Predio UTN',
    direccion: 'Av. del Libertador 7395, Núñez, CABA',
    categoria: catFestivales,
    imagen: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    organizador: orgSonora,
    descripcion: 'El festival universitario de música electrónica, rock e indie más esperado del año. Más de 12 artistas en vivo en dos escenarios simultáneos con tecnología visual y sonido inmersivo.',
    tiposEntrada: [teGen1, teVip1, teLounge1],
  });

  const evento2 = new Evento({
    id: 'evt-electro-2',
    nombre: 'Noche Electrónica Underground',
    destacado: false,
    fecha: '2026-11-18T23:00:00',
    fechaTexto: '18 de Noviembre 2026 • 23:00 hs',
    apertura: '22:00 hs',
    ubicacion: 'Club Niceto • Palermo',
    direccion: 'Niceto Vega 5510, Palermo, CABA',
    categoria: catRecitales,
    imagen: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    organizador: orgUnderground,
    descripcion: 'Una noche de deep house, techno melódico y visuales de alta fidelidad con DJ internacionales.',
    tiposEntrada: [teUnderGen, teUnderVip],
  });

  const evento3 = new Evento({
    id: 'evt-teatro-3',
    nombre: 'Obra: El Método Grönholm',
    destacado: false,
    fecha: '2026-11-22T20:30:00',
    fechaTexto: '22 de Noviembre 2026 • 20:30 hs',
    apertura: '20:00 hs',
    ubicacion: 'Paseo La Plaza • Sala Pablo Neruda',
    direccion: 'Av. Corrientes 1660, San Nicolás, CABA',
    categoria: catTeatro,
    imagen: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80',
    organizador: orgTeatros,
    descripcion: 'Aclamada comedia dramática sobre cuatro postulantes compitiendo ferozmente por un codiciado puesto ejecutivo.',
    tiposEntrada: [teTeatroPlatea, teTeatroPullman],
  });

  const evento4 = new Evento({
    id: 'evt-conf-4',
    nombre: 'DevFest & Cloud Summit 2026',
    destacado: false,
    fecha: '2026-12-05T09:00:00',
    fechaTexto: '5 de Diciembre 2026 • 09:00 hs',
    apertura: '08:00 hs',
    ubicacion: 'Centro de Convenciones Buenos Aires',
    direccion: 'Av. Figueroa Alcorta 2099, Recoleta, CABA',
    categoria: catConferencias,
    imagen: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    organizador: orgTech,
    descripcion: 'Charlas magistrales sobre Inteligencia Artificial, computación en la nube, arquitecturas modernas y networking técnico.',
    tiposEntrada: [teConfPass],
  });

  const eventos = [evento1, evento2, evento3, evento4];
  const fechaCompraDePrueba = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // 5. Compras — comprador, evento y tipoEntrada como referencias directas
  const compra1 = new Compra({
    id: 'compra-1',
    ordenCodigo: '#TK-84920',
    comprador: compradorMathi,
    evento: evento1,
    tipoEntrada: teGen1,
    cantidad: 2,
    total: teGen1.precio * 2,
    estado: EstadoCompra.CONFIRMADA,
    fechaHora: fechaCompraDePrueba,
    reseniaRealizada: false,
    mensajes: [
      new Mensaje({
        id: 'msg-1',
        usuario: compradorMathi,
        mensaje: '¡Hola! ¿A qué hora abren las puertas del predio? ¿Hay estacionamiento disponible en el lugar?',
        enviado: new Date(Date.now() - 3600000 * 2),
      }),
      new Mensaje({
        id: 'msg-2',
        usuario: orgSonora,
        mensaje: '¡Buenas tardes! Las puertas abren puntualmente a las 18:00 hs. Sí, contaremos con estacionamiento vigilado por orden de llegada con tarifa especial presentando tu entrada digital.',
        enviado: new Date(Date.now() - 3600000 * 1.5),
      }),
    ],
  });

  const compra2 = new Compra({
    id: 'compra-2',
    ordenCodigo: '#TK-39218',
    comprador: compradoraLucia,
    evento: evento2,
    tipoEntrada: teUnderGen,
    cantidad: 1,
    total: teUnderGen.precio * 1,
    estado: EstadoCompra.PENDIENTE,
    fechaHora: fechaCompraDePrueba,
    reseniaRealizada: false,
    mensajes: [],
  });

  const compra3 = new Compra({
    id: 'compra-3',
    ordenCodigo: '#TK-10492',
    comprador: compradoraLucia,
    evento: evento3,
    tipoEntrada: teTeatroPlatea,
    cantidad: 2,
    total: teTeatroPlatea.precio * 2,
    estado: EstadoCompra.UTILIZADA,
    fechaHora: fechaCompraDePrueba,
    reseniaRealizada: false,
    mensajes: [],
  });

  const compras = [compra1, compra2, compra3];

  return { usuarios, categorias, eventos, compras };
}

export const seedData = createSeedData();
