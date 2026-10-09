// Cabecera de la aplicacion.
//
// Va fuera de <main> a proposito. El punto de referencia "banner" no puede
// anidarse dentro del contenido: quien navega por landmarks con lector de
// pantalla espera encontrarlo al nivel de la pagina, no dentro de lo que
// viene a leer. Antes vivia dentro de <main> y nadie lo habia notado porque
// las auditorias examinan componentes sueltos, no la aplicacion montada.
//
// Reune marca, navegacion y sesion, para que todas las pantallas compartan
// los mismos puntos de referencia: si cambian de una a otra, hay que
// reaprender la interfaz cada vez.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import './AppHeader.css';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Sin sesion no hay nada que encabezar: el inicio de sesion y la portada se
  // presentan solos.
  if (!user) return null;

  const enlaces = [
    { a: '/panel', texto: 'Mis cursos' },
    ...(user.rol === 'administrador' ? [{ a: '/usuarios', texto: 'Usuarios' }] : []),
  ];

  return (
    <header className="cabecera">
      <div className="cabecera__fila">
        <Link className="cabecera__marca" to="/panel">
          <span className="cabecera__simbolo" aria-hidden="true">
            <Icon nombre="libro" tamano={20} />
          </span>
          <span className="cabecera__nombre">
            Aula Todos
            <span className="cabecera__lema">Clases accesibles para estudiantes con menor capacidad auditiva</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="cabecera__nav">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.a}
              to={enlace.a}
              // aria-current lo anuncia el lector de pantalla; no basta con
              // que se vea distinto.
              aria-current={location.pathname === enlace.a ? 'page' : undefined}
            >
              {enlace.texto}
            </Link>
          ))}
        </nav>

        <div className="cabecera__sesion">
          <span className="cabecera__usuario">
            <strong>{user.nombre_completo}</strong>
            <span className="cabecera__rol">{user.rol}</span>
          </span>
          <button type="button" className="cabecera__salir" onClick={logout}>
            <Icon nombre="salir" tamano={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}
