// Ruta que exige sesion iniciada y, opcionalmente, un rol concreto.
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, authenticated, loading, sessionExpired } = useAuth();
  const location = useLocation();

  // Mientras se valida el token no se decide nada: redirigir aqui expulsaria a
  // un usuario con sesion valida cada vez que recarga la pagina.
  if (loading) {
    return <p aria-live="polite">Comprobando su sesión…</p>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname, expired: sessionExpired }} />;
  }

  // Ocultar el enlace en la navegacion no es control de acceso: cualquiera
  // puede escribir la direccion. La API rechaza la peticion, pero sin esta
  // comprobacion el usuario veria una pantalla que no le corresponde y un
  // formulario que nunca funcionaria.
  if (roles && !roles.includes(user.rol)) {
    return (
      <div>
        <h1>No tiene permiso para ver esta página</h1>
        <p>
          Su cuenta de <strong>{user.rol}</strong> no puede acceder a esta
          sección. Si cree que se trata de un error, avise a su docente.
        </p>
        <p>
          <Link to="/panel">Volver a mis cursos</Link>
        </p>
      </div>
    );
  }

  return children;
}
