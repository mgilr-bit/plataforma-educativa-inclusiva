// Panel del docente: los cursos que imparte.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/Layout';
import { LoadingState, ErrorState, EmptyState } from '../components/EstadoCarga';
import './Panel.css';

export default function TeacherPanel() {
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
      <p>Aquí administra el material de los cursos que imparte.</p>

      {state.loading && <LoadingState label="Cargando sus cursos…" />}
      {state.error && <ErrorState message={state.error} onRetry={load} />}

      {state.courses && state.courses.length === 0 && (
        <EmptyState
          title="Todavía no tiene cursos asignados"
          description="El administrador de la plataforma es quien asigna los cursos a cada docente."
        />
      )}

      {state.courses && state.courses.length > 0 && (
        <ul className="tarjetas">
          {state.courses.map((curso) => (
            <li key={curso.id_curso} className="tarjeta">
              <h2 className="tarjeta__titulo">
                <Link to={`/cursos/${curso.id_curso}`}>{curso.nombre}</Link>
              </h2>
              <p className="tarjeta__detalle">
                {curso.grado} · Ciclo {curso.ciclo_escolar}
              </p>
              {/* Se escribe la cifra y la palabra: "5" a secas no dice de que. */}
              <p className="tarjeta__detalle">
                {curso.inscritos === 1 ? '1 estudiante inscrito' : `${curso.inscritos} estudiantes inscritos`}
                {' · '}
                {curso.contenidos === 1 ? '1 material publicado' : `${curso.contenidos} materiales publicados`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
