// Panel posterior al inicio de sesion.
//
// Provisional: los paneles del estudiante y del docente son las tareas #27 y
// #28. Aqui solo se confirma quien inicio sesion y con que rol.
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <>
      <h1>Bienvenido, {user.nombre_completo}</h1>
      <p>
        Ha iniciado sesión como <strong>{user.rol}</strong>.
      </p>
      <p>
        Las pantallas de esta sección están en construcción.
      </p>
      <button type="button" onClick={logout}>
        Cerrar sesión
      </button>
    </>
  );
}
