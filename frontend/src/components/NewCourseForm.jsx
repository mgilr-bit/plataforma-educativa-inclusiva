// Alta de curso. Solo el administrador puede crearlos y asignar el titular.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import FormField from './FormField';

export default function NewCourseForm({ onCreated }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolYear, setSchoolYear] = useState(String(new Date().getFullYear()));
  const [teacherId, setTeacherId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const errorRef = useRef(null);
  const nameRef = useRef(null);

  // Los docentes se ofrecen en una lista en vez de pedir un identificador:
  // nadie recuerda que Ana Perez es el usuario 2.
  useEffect(() => {
    let active = true;
    api.users({ role: 'docente', active: 'true' })
      .then((data) => {
        if (!active) return;
        setTeachers(data.usuarios);
        if (data.usuarios.length > 0) setTeacherId(String(data.usuarios[0].id_usuario));
      })
      .catch(() => { if (active) setTeachers([]); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const errores = {};
    if (name.trim().length === 0) errores.name = 'Escriba el nombre del curso.';
    if (grade.trim().length === 0) errores.grade = 'Escriba el grado.';
    if (!teacherId) errores.teacher = 'Elija el docente que lo impartirá.';
    setFieldErrors(errores);
    if (Object.keys(errores).length > 0) {
      if (errores.name) nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.createCourse({
        name: name.trim(), grade: grade.trim(), schoolYear, teacherId,
      });
      setName('');
      setGrade('');
      onCreated?.(data.curso);
      nameRef.current?.focus();
    } catch (error) {
      setFormError(error.message);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="titulo-nuevo-curso">
      <h2 id="titulo-nuevo-curso">Crear curso</h2>

      {formError && (
        <div className="alerta-error" role="alert" tabIndex={-1} ref={errorRef}>
          {formError}
        </div>
      )}

      {teachers.length === 0 && (
        <p className="mensaje-aviso" role="status">
          No hay docentes activos todavía. Cree primero una cuenta de docente en
          la pantalla de usuarios.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="curso-nombre" label="Nombre del curso" value={name} onChange={setName}
          error={fieldErrors.name} required disabled={submitting} inputRef={nameRef}
        />
        <FormField
          id="curso-grado" label="Grado" value={grade} onChange={setGrade}
          error={fieldErrors.grade} help="Por ejemplo: Primero Básico."
          required disabled={submitting}
        />
        <FormField
          id="curso-ciclo" label="Ciclo escolar" type="number" value={schoolYear}
          onChange={setSchoolYear} required disabled={submitting}
        />

        <div className="form-field">
          <label className="form-field__label" htmlFor="curso-docente">Docente</label>
          <select
            id="curso-docente" className="form-field__input" value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            disabled={submitting || teachers.length === 0}
            aria-describedby={fieldErrors.teacher ? 'curso-docente-error' : undefined}
            aria-invalid={fieldErrors.teacher ? 'true' : undefined}
          >
            {teachers.map((d) => (
              <option key={d.id_usuario} value={d.id_usuario}>{d.nombre_completo}</option>
            ))}
          </select>
          {fieldErrors.teacher && (
            <p className="form-field__error" id="curso-docente-error">
              <span aria-hidden="true">⚠ </span>{fieldErrors.teacher}
            </p>
          )}
        </div>

        <button className="boton-principal" type="submit" disabled={submitting || teachers.length === 0}>
          {submitting ? 'Creando…' : 'Crear curso'}
        </button>
      </form>
    </section>
  );
}
