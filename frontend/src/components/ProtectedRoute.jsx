// Ruta que exige sesion iniciada.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { authenticated, loading, sessionExpired } = useAuth();
  const location = useLocation();

  // Mientras se valida el token no se decide nada: redirigir aqui expulsaria a
  // un usuario con sesion valida cada vez que recarga la pagina.
  if (loading) {
    return <p aria-live="polite">Comprobando su sesión…</p>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname, expired: sessionExpired }} />;
  }

  return children;
}
