// Panel del estudiante: los cursos en los que esta inscrito.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/Layout';
import { LoadingState, ErrorState, EmptyState } from '../components/EstadoCarga';
import './Panel.css';

export default function StudentPanel() {
  const [state, setState] = useState({ loading: true });

  function load() {
    setState({ loading: true });
    api.courses()
      .then((data) => setState({ loading: false, courses: data.cursos }))
      .catch((error) => setState({ loading: false, error: error.message }));
  }

  useEffect(load, []);

  return (
    <Layout>
      <h1>Mis cursos</h1>

      {state.loading && <LoadingState label="Cargando sus cursos…" />}
      {state.error && <ErrorState message={state.error} onRetry={load} />}

      {state.courses && state.courses.length === 0 && (
        <EmptyState
          title="Todavía no tiene cursos"
          description="Cuando su docente lo inscriba en un curso, aparecerá aquí."
        />
      )}

      {state.courses && state.courses.length > 0 && (
        <ul className="tarjetas">
          {state.courses.map((curso) => (
            <li key={curso.id_curso} className="tarjeta">
              <h2 className="tarjeta__titulo">
                {/* El enlace envuelve el titulo, no un "ver mas": un lector de
                    pantalla que recorra los enlaces oye el nombre del curso. */}
                <Link to={`/cursos/${curso.id_curso}`}>{curso.nombre}</Link>
              </h2>
              <p className="tarjeta__detalle">
                {curso.grado} · Ciclo {curso.ciclo_escolar}
              </p>
              <p className="tarjeta__detalle">
                Docente: {curso.docente}
              </p>
              <p className="tarjeta__detalle">
                {curso.contenidos === 1
                  ? '1 material disponible'
                  : `${curso.contenidos} materiales disponibles`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
