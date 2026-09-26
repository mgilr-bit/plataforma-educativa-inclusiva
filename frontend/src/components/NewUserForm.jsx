// Alta de usuario.
import { useRef, useState } from 'react';
import { api } from '../api/client';
import FormField from './FormField';

const MIN_PASSWORD = 8;

export default function NewUserForm({ roles, onCreated }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(3);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const errorRef = useRef(null);
  const nameRef = useRef(null);

  function validar() {
    const errores = {};
    if (fullName.trim().length < 3) errores.fullName = 'Escriba el nombre completo.';
    if (!email.includes('@')) errores.email = 'El correo debe incluir una arroba.';
    if (password.length < MIN_PASSWORD) {
      errores.password = `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`;
    }
    return errores;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const errores = validar();
    setFieldErrors(errores);
    if (Object.keys(errores).length > 0) {
      if (errores.fullName) nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        roleId: Number(roleId),
      });
      setFullName('');
      setEmail('');
      setPassword('');
      onCreated?.(data.usuario);
      nameRef.current?.focus();
    } catch (error) {
      setFormError(error.message);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="titulo-nuevo-usuario">
      <h2 id="titulo-nuevo-usuario">Crear cuenta</h2>

      {formError && (
        <div className="alerta-error" role="alert" tabIndex={-1} ref={errorRef}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="nuevo-nombre"
          label="Nombre completo"
          value={fullName}
          onChange={setFullName}
          error={fieldErrors.fullName}
          autoComplete="off"
          required
          disabled={submitting}
          inputRef={nameRef}
        />

        <FormField
          id="nuevo-correo"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          autoComplete="off"
          required
          disabled={submitting}
        />

        <FormField
          id="nueva-contrasena"
          label="Contraseña inicial"
          type="password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          help="Mínimo 8 caracteres. La persona podrá cambiarla después."
          autoComplete="new-password"
          required
          disabled={submitting}
        />

        <div className="form-field">
          <label className="form-field__label" htmlFor="nuevo-rol">Rol de la cuenta</label>
          <select
            id="nuevo-rol"
            className="form-field__input"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={submitting}
          >
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>{rol.nombre}</option>
            ))}
          </select>
        </div>

        <button className="boton-principal" type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
    </section>
  );
}
