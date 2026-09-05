// Estudiantes inscritos en un curso. Solo lo ve el docente titular.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LoadingState, ErrorState, EmptyState } from './EstadoCarga';

export default function EnrolledStudents({ courseId }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let active = true;
    api.enrollments(courseId)
      .then((data) => { if (active) setState({ loading: false, students: data.inscritos }); })
      .catch((error) => { if (active) setState({ loading: false, error: error.message }); });
    return () => { active = false; };
  }, [courseId]);

  return (
    <section aria-labelledby="titulo-inscritos">
      <h2 id="titulo-inscritos">Estudiantes inscritos</h2>

      {state.loading && <LoadingState label="Cargando la lista…" />}
      {state.error && <ErrorState message={state.error} />}

      {state.students && state.students.length === 0 && (
        <EmptyState
          title="Nadie inscrito todavía"
          description="Las inscripciones las gestiona usted o el administrador."
        />
      )}

      {state.students && state.students.length > 0 && (
        <ul className="lista-simple">
          {state.students.map((estudiante) => (
            <li key={estudiante.id_usuario}>
              {estudiante.nombre_completo}
              <span className="lista-simple__detalle"> · {estudiante.correo}</span>
              {/* La cuenta desactivada se dice con palabras, no solo con un
                  color o un icono. */}
              {!estudiante.estado && (
                <span className="lista-simple__aviso"> · cuenta desactivada</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
