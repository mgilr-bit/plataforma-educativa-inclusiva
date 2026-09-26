// Estudiantes inscritos en un curso. Solo lo ve el docente titular.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { LoadingState, ErrorState, EmptyState } from './EstadoCarga';

export default function EnrolledStudents({ courseId }) {
  const [state, setState] = useState({ loading: true });
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState('');
  const [aviso, setAviso] = useState(null);
  const [working, setWorking] = useState(false);

  const avisoRef = useRef(null);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    api.enrollments(courseId)
      .then((data) => setState({ loading: false, enrolled: data.inscritos }))
      .catch((error) => setState({ loading: false, error: error.message }));
  }, [courseId]);

  useEffect(load, [load]);

  // Los estudiantes disponibles se ofrecen en una lista: pedir el
  // identificador obligaria al docente a buscarlo por su cuenta.
  useEffect(() => {
    let active = true;
    api.users({ role: 'estudiante', active: 'true' })
      .then((data) => { if (active) setStudents(data.usuarios); })
      .catch(() => { if (active) setStudents([]); });
    return () => { active = false; };
  }, []);

  async function inscribir(event) {
    event.preventDefault();
    if (!selected) return;
    setWorking(true);
    setAviso(null);
    try {
      await api.enroll(courseId, selected);
      const alumno = students.find((e) => String(e.id_usuario) === String(selected));
      setAviso(`Se inscribió a ${alumno ? alumno.nombre_completo : 'el estudiante'}.`);
      setSelected('');
      load();
    } catch (error) {
      setAviso(error.message);
      window.requestAnimationFrame(() => avisoRef.current?.focus());
    } finally {
      setWorking(false);
    }
  }

  async function darDeBaja(estudiante) {
    setWorking(true);
    setAviso(null);
    try {
      await api.unenroll(courseId, estudiante.id_usuario);
      setAviso(`Se dio de baja a ${estudiante.nombre_completo}.`);
      load();
    } catch (error) {
      setAviso(error.message);
      window.requestAnimationFrame(() => avisoRef.current?.focus());
    } finally {
      setWorking(false);
    }
  }

  // No tiene sentido ofrecer a quien ya esta inscrito.
  const inscritosIds = new Set((state.enrolled || []).map((e) => e.id_usuario));
  const disponibles = students.filter((e) => !inscritosIds.has(e.id_usuario));

  return (
    <section aria-labelledby="titulo-inscritos">
      <h2 id="titulo-inscritos">Estudiantes inscritos</h2>

      {aviso && (
        <p className="mensaje-aviso" role="status" tabIndex={-1} ref={avisoRef}>
          {aviso}
        </p>
      )}

      {state.loading && <LoadingState label="Cargando la lista…" />}
      {state.error && <ErrorState message={state.error} onRetry={load} />}

      {state.enrolled && state.enrolled.length === 0 && (
        <EmptyState
          title="Nadie inscrito todavía"
          description="Use el formulario de abajo para inscribir a sus estudiantes."
        />
      )}

      {state.enrolled && state.enrolled.length > 0 && (
        <ul className="lista-simple">
          {state.enrolled.map((estudiante) => (
            <li key={estudiante.id_usuario}>
              {estudiante.nombre_completo}
              <span className="lista-simple__detalle"> · {estudiante.correo}</span>
              {!estudiante.estado && (
                <span className="lista-simple__aviso"> · cuenta desactivada</span>
              )}
              {/* El nombre completo va en aria-label, no en un sufijo oculto:
                  el calculo del nombre accesible pegaria las palabras. */}
              <button
                type="button"
                onClick={() => darDeBaja(estudiante)}
                disabled={working}
                aria-label={`Dar de baja a ${estudiante.nombre_completo}`}
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={inscribir}>
        <div className="form-field">
          <label className="form-field__label" htmlFor="inscribir-estudiante">
            Inscribir a un estudiante
          </label>
          <select
            id="inscribir-estudiante"
            className="form-field__input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={working || disponibles.length === 0}
          >
            <option value="">Elija un estudiante</option>
            {disponibles.map((e) => (
              <option key={e.id_usuario} value={e.id_usuario}>{e.nombre_completo}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={working || !selected}>
          {working ? 'Guardando…' : 'Inscribir'}
        </button>
      </form>
    </section>
  );
}
