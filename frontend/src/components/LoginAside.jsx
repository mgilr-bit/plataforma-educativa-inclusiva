// Panel de presentacion del inicio de sesion.
//
// La pantalla era un formulario solo en medio de una pagina en blanco. Este
// panel llena ese lado diciendo algo util: que es esta plataforma y que hace,
// porque el inicio de sesion es la primera —y a veces la unica— pantalla que
// ve alguien que llega sin saber.
//
// Las figuras del fondo son SVG dibujado aqui y no una fotografia. Una
// fotografia habria que traerla de algun sitio con su licencia, pesaria
// cientos de kilobytes en una conexion que no siempre acompaña, y el texto
// encima dejaria de tener el contraste medido. Esto pesa nada y se apaga solo
// en alto contraste.
import Icon from './Icon';
import './LoginAside.css';

const LO_QUE_HACE = [
  {
    icono: 'texto',
    titulo: 'La clase, escrita',
    detalle: 'Lo que el docente dice se convierte en texto y en subtítulos.',
  },
  {
    icono: 'libro',
    titulo: 'Un resumen fácil de leer',
    detalle: 'Frases cortas y las palabras nuevas explicadas.',
  },
  {
    icono: 'conversacion',
    titulo: 'Alguien a quien preguntar',
    detalle: 'Un asistente que responde sobre la clase, sin pena.',
  },
];

export default function LoginAside() {
  return (
    <aside className="presentacion">
      {/* Decorativo: no describe nada que el texto no diga, asi que se oculta
          a los lectores de pantalla en vez de inventarle una descripcion. */}
      <svg className="presentacion__figuras" aria-hidden="true" focusable="false" viewBox="0 0 400 600">
        <circle cx="330" cy="90" r="120" />
        <circle cx="60" cy="520" r="150" />
        <rect x="250" y="330" width="170" height="170" rx="36" transform="rotate(18 335 415)" />
      </svg>

      <div className="presentacion__contenido">
        <p className="presentacion__marca">
          <span className="presentacion__simbolo" aria-hidden="true">
            <Icon nombre="libro" tamano={26} />
          </span>
          Aula Todos
        </p>

        <p className="presentacion__lema">
          Clases accesibles para estudiantes con menor capacidad auditiva.
        </p>

        <ul className="presentacion__lista">
          {LO_QUE_HACE.map((cosa) => (
            <li key={cosa.titulo}>
              <span className="presentacion__icono" aria-hidden="true">
                <Icon nombre={cosa.icono} tamano={20} />
              </span>
              <span>
                <strong>{cosa.titulo}</strong>
                <span className="presentacion__detalle">{cosa.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
