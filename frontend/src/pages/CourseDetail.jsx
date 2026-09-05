// Materiales de un curso.
//
// La misma pantalla sirve al estudiante y al docente: la API ya filtra por rol,
// de modo que cada uno recibe lo que le corresponde sin duplicar codigo.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/Layout';
import { LoadingState, ErrorState, EmptyState } from '../components/EstadoCarga';
import EnrolledStudents from '../components/EnrolledStudents';
import NewContentForm from '../components/NewContentForm';
import { useAuth } from '../context/AuthContext';
import './Panel.css';

// Se nombran en palabras, no con iconos sueltos: un icono sin texto no lo
// anuncia el lector de pantalla y no todos los alumnos lo interpretan igual.
const TIPOS = {
  video: 'Video',
  audio: 'Audio',
  documento: 'Documento',
  texto: 'Texto',
};

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true });

  // El estudiante solo consulta; el docente titular y el administrador
  // administran el curso.
  const canManage = user.rol !== 'estudiante';

  function load() {
    setState({ loading: true });
    Promise.all([api.course(id), api.contents({ course: id })])
      .then(([curso, contenidos]) =>
        setState({ loading: false, course: curso.curso, contents: contenidos.contenidos }))
      .catch((error) => setState({ loading: false, error: error.message }));
  }

  useEffect(load, [id]);

  return (
    <Layout>
      {/* Migas de pan: dan una salida clara sin depender del boton "atras". */}
      <nav aria-label="Ruta de navegación" className="migas">
        <Link to="/panel">Mis cursos</Link>
        <span aria-hidden="true"> › </span>
        <span aria-current="page">{state.course ? state.course.nombre : 'Curso'}</span>
      </nav>

      {state.loading && <LoadingState label="Cargando el curso…" />}
      {state.error && <ErrorState message={state.error} onRetry={load} />}

      {state.course && (
        <>
          <h1>{state.course.nombre}</h1>
          <p>
            {state.course.grado} · Ciclo {state.course.ciclo_escolar} · Docente: {state.course.docente}
          </p>

          <h2>Materiales</h2>

          {state.contents.length === 0 && (
            <EmptyState
              title="Este curso todavía no tiene materiales"
              description="Cuando el docente cargue una clase, aparecerá aquí."
            />
          )}

          {state.contents.length > 0 && (
            <ul className="tarjetas">
              {state.contents.map((contenido) => (
                <li key={contenido.id_contenido} className="tarjeta">
                  <h3 className="tarjeta__titulo">
                    <Link to={`/contenidos/${contenido.id_contenido}`}>
                      {contenido.titulo}
                    </Link>
                  </h3>
                  <p className="tarjeta__detalle">
                    {TIPOS[contenido.tipo] || contenido.tipo}
                    {contenido.duracion_seg
                      ? ` · ${Math.round(contenido.duracion_seg / 60)} minutos`
                      : ''}
                    {contenido.estado === false && ' · Retirado'}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {canManage && (
            <>
              <NewContentForm
                courseId={id}
                onCreated={(contenido) =>
                  setState((s) => ({ ...s, contents: [contenido, ...s.contents] }))}
              />
              <EnrolledStudents courseId={id} />
            </>
          )}
        </>
      )}
    </Layout>
  );
}
