// Pagina de inicio. En esta primera entrega sirve de comprobacion de que el
// frontend alcanza la API desplegada; las pantallas reales llegan con las
// tareas siguientes de la fase.
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Home() {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let active = true;
    api.health()
      .then((data) => { if (active) setState({ loading: false, data }); })
      .catch((error) => { if (active) setState({ loading: false, error: error.message }); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <h1>Plataforma Educativa Inclusiva</h1>
      <p>
        Apoyo educativo con inteligencia artificial para estudiantes con
        discapacidad auditiva.
      </p>

      <h2>Estado de la conexión</h2>

      {/* aria-live avisa al lector de pantalla cuando el contenido cambia,
          sin que el usuario tenga que ir a buscarlo. */}
      <p aria-live="polite">
        {state.loading && 'Consultando el servidor…'}
        {state.error && `No se pudo conectar: ${state.error}`}
        {state.data && `Conectado. Roles registrados: ${state.data.rolesRegistrados}.`}
      </p>
    </>
  );
}
