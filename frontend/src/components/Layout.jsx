// Estructura comun de las pantallas con sesion iniciada.
//
// Reune la cabecera, la navegacion y el pie, para que todas las pantallas
// compartan los mismos puntos de referencia. Quien navega con lector de
// pantalla se orienta por esos puntos: si cambian de una pantalla a otra,
// tiene que reaprender la interfaz cada vez.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="layout">
      <header className="layout__header">
        <Link className="layout__marca" to="/panel">
          Plataforma Educativa
        </Link>

        <nav aria-label="Principal" className="layout__nav">
          {/* aria-current marca la pagina activa: lo anuncia el lector de
              pantalla, no solo se ve. */}
          <Link
            to="/panel"
            aria-current={location.pathname === '/panel' ? 'page' : undefined}
          >
            Mis cursos
          </Link>

          {/* La gestion de usuarios solo existe para el administrador; la API
              rechazaria al resto, y mostrar un enlace que lleva a un error es
              peor que no mostrarlo. */}
          {user?.rol === 'administrador' && (
            <Link
              to="/usuarios"
              aria-current={location.pathname === '/usuarios' ? 'page' : undefined}
            >
              Usuarios
            </Link>
          )}
        </nav>

        {user && (
          <div className="layout__usuario">
            <span className="layout__nombre">
              {user.nombre_completo}
              <span className="layout__rol"> · {user.rol}</span>
            </span>
            <button type="button" className="layout__salir" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {children}
    </div>
  );
}
