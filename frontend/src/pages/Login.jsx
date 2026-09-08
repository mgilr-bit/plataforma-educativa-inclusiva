// Pantalla de inicio de sesion.
import { useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import './Login.css';

const MIN_PASSWORD = 8;

export default function Login() {
  const { login, authenticated, loading: checkingSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Al expulsar por sesion vencida se guarda la pantalla de origen, para
  // devolver al usuario donde estaba en vez de al panel generico.
  const origen = location.state?.from || '/panel';
  const sesionVencida = Boolean(location.state?.expired);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Al fallar el envio se lleva el foco al aviso: quien navega con teclado o
  // con lector de pantalla no tiene por que descubrir el error por su cuenta.
  const errorRef = useRef(null);
  const emailRef = useRef(null);

  if (checkingSession) {
    return <p aria-live="polite">Comprobando su sesión…</p>;
  }

  if (authenticated) {
    return <Navigate to={origen} replace />;
  }

  // La validacion se repite en el servidor; aqui evita un viaje innecesario y
  // da una respuesta inmediata.
  function validate() {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Escriba su correo electrónico.';
    } else if (!email.includes('@')) {
      errors.email = 'El correo debe incluir una arroba, por ejemplo: nombre@umg.edu.gt';
    }
    if (!password) {
      errors.password = 'Escriba su contraseña.';
    } else if (password.length < MIN_PASSWORD) {
      errors.password = `La contraseña tiene al menos ${MIN_PASSWORD} caracteres.`;
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // Se enfoca el primer campo con problema.
      if (errors.email) emailRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(origen, { replace: true });
    } catch (error) {
      setFormError(
        error.status === 0
          ? 'No se pudo conectar con el servidor. Revise su conexión a internet.'
          : error.message
      );
      // Se espera al repintado para que el aviso exista antes de enfocarlo.
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <h1>Iniciar sesión</h1>
      <p>Ingrese con el correo que le proporcionó su establecimiento.</p>

      {/* role="alert" hace que el lector de pantalla lo anuncie al aparecer.
          tabIndex -1 permite enfocarlo por codigo sin meterlo en el recorrido
          normal del tabulador. */}
      {sesionVencida && !formError && (
        <p className="mensaje-aviso" role="status">
          Su sesión terminó por seguridad. Vuelva a entrar para continuar.
        </p>
      )}

      {formError && (
        <div className="alerta-error" role="alert" tabIndex={-1} ref={errorRef}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="correo"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          autoComplete="username"
          required
          disabled={submitting}
          inputRef={emailRef}
        />

        <FormField
          id="contrasena"
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          autoComplete="current-password"
          required
          disabled={submitting}
        />

        <button className="boton-principal" type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>

        {/* El cambio de estado se anuncia sin robar el foco. */}
        <p className="sr-only" aria-live="polite">
          {submitting ? 'Comprobando sus datos, espere.' : ''}
        </p>
      </form>
    </div>
  );
}
