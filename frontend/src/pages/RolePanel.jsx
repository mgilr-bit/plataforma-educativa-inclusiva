// Elige el panel segun el rol de quien inicio sesion.
//
// La ruta es la misma para todos, /panel, de modo que nadie tiene que recordar
// una direccion distinta segun quien sea.
import { useAuth } from '../context/AuthContext';
import StudentPanel from './StudentPanel';
import TeacherPanel from './TeacherPanel';

export default function RolePanel() {
  const { user } = useAuth();

  // ProtectedRoute garantiza que haya usuario, pero caerse aqui dejaria la
  // pantalla en blanco sin explicacion. Es el segundo componente donde aparece
  // el mismo modo de fallo, asi que se protege igual.
  if (!user) {
    return <p aria-live="polite">Comprobando su sesión…</p>;
  }

  // El administrador ve el panel del docente: la API le muestra todos los
  // cursos, y las acciones disponibles son las mismas.
  if (user.rol === 'estudiante') {
    return <StudentPanel />;
  }
  return <TeacherPanel />;
}
