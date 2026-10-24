// Marco de las pantallas de administracion.
//
// La barra lateral existe porque la administracion son varias pantallas
// distintas y el administrador salta entre ellas: con los enlaces en la
// cabecera general se perderian entre lo que usan docentes y estudiantes.
//
// Es un <nav> propio, con su nombre: quien navega por puntos de referencia
// distingue asi la navegacion de la seccion de la navegacion del sitio.
import { NavLink } from 'react-router-dom';
import './AdminLayout.css';

const SECCIONES = [
  { a: '/usuarios', texto: 'Usuarios' },
  { a: '/panel', texto: 'Cursos' },
  { a: '/configuracion', texto: 'Configuración' },
];

export default function AdminLayout({ children }) {
  return (
    <div className="admin">
      <nav className="admin__barra" aria-label="Secciones de administración">
        <ul>
          {SECCIONES.map((seccion) => (
            <li key={seccion.a}>
              <NavLink
                to={seccion.a}
                // NavLink pone aria-current="page" solo: lo anuncia el lector
                // de pantalla, no basta con que se vea distinto.
                className={({ isActive }) => (isActive ? 'admin__enlace admin__enlace--activo' : 'admin__enlace')}
              >
                {seccion.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="admin__contenido">{children}</div>
    </div>
  );
}
