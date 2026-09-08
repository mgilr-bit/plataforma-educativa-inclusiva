// Cliente de la API.
//
// Centraliza la URL base, el token de sesion y el formato de los errores, para
// que ningun componente tenga que conocer esos detalles.
//
// Nota sobre los nombres: los identificadores van en ingles, pero las claves
// que viajan a la API van en espanol porque asi esta definido su contrato.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'plataforma.token';

// El token se guarda en localStorage para que la sesion sobreviva a recargar la
// pagina. Queda expuesto a scripts de la propia pagina, riesgo que se asume a
// cambio de no depender de cookies entre dominios distintos: el frontend vive
// en Vercel y la API en Railway.
export function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Modo privado o almacenamiento bloqueado: la sesion dura lo que la pestana.
    return null;
  }
}

export function saveToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sin almacenamiento, la sesion sigue viva en memoria durante la visita.
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nada que limpiar.
  }
}

// Que hacer cuando la API rechaza una peticion autenticada.
//
// El token vence a las ocho horas, asi que un estudiante que abre la
// plataforma por la manana y vuelve por la tarde se encuentra con un 401. Sin
// esto veria el mensaje de error crudo de la API en mitad de la pantalla, sin
// entender que solo tiene que volver a entrar.
let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Error con el codigo HTTP y el detalle por campo que devuelve la API.
export class ApiError extends Error {
  constructor(message, { status, details, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details || [];
    this.cause = cause;
  }
}

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (authenticated) {
    const token = readToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // Sin conexion o servidor inalcanzable. Se distingue de un error devuelto
    // por la API para poder explicarselo al usuario en esos terminos.
    throw new ApiError('No se pudo conectar con el servidor. Revise su conexión.', {
      status: 0,
      cause: error,
    });
  }

  // Una respuesta 204 no trae cuerpo.
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    // Solo cuenta como sesion vencida si la peticion llevaba token: un 401 en
    // el inicio de sesion significa credenciales incorrectas, no sesion caida.
    if (response.status === 401 && authenticated) {
      clearToken();
      onUnauthorized?.();
    }

    throw new ApiError(data.mensaje || 'Ocurrió un error inesperado', {
      status: response.status,
      details: data.errores,
    });
  }

  return data;
}

export const api = {
  health: () => request('/health', { authenticated: false }),

  // La API define el contrato en espanol: correo y contrasena.
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { correo: email, contrasena: password },
      authenticated: false,
    }),

  profile: () => request('/auth/me'),

  users: (filters = {}) => {
    const query = new URLSearchParams();
    if (filters.role) query.set('rol', filters.role);
    if (filters.active !== undefined && filters.active !== '') query.set('estado', filters.active);
    if (filters.search) query.set('buscar', filters.search);
    if (filters.page) query.set('pagina', filters.page);
    const suffix = query.toString() ? `?${query}` : '';
    return request(`/users${suffix}`);
  },

  createUser: ({ fullName, email, password, roleId }) =>
    request('/users', {
      method: 'POST',
      body: { nombreCompleto: fullName, correo: email, contrasena: password, idRol: roleId },
    }),

  updateUser: (id, changes) => {
    // Solo se envian los campos indicados: la API interpreta la ausencia como
    // "no tocar", y mandar el resto en blanco los borraria.
    const body = {};
    if (changes.fullName !== undefined) body.nombreCompleto = changes.fullName;
    if (changes.email !== undefined) body.correo = changes.email;
    if (changes.password !== undefined) body.contrasena = changes.password;
    if (changes.roleId !== undefined) body.idRol = changes.roleId;
    if (changes.active !== undefined) body.estado = changes.active;
    return request(`/users/${id}`, { method: 'PATCH', body });
  },

  deactivateUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // La API filtra por rol: el estudiante recibe los cursos en los que esta
  // inscrito y el docente los que imparte, sin que el frontend deba pedirlo.
  courses: () => request('/courses'),
  course: (id) => request(`/courses/${id}`),

  createCourse: ({ name, grade, schoolYear, teacherId }) =>
    request('/courses', {
      method: 'POST',
      body: { nombre: name, grado: grade, cicloEscolar: Number(schoolYear), idDocente: Number(teacherId) },
    }),

  enroll: (courseId, studentId) =>
    request(`/courses/${courseId}/enrollments`, {
      method: 'POST',
      body: { idEstudiante: Number(studentId) },
    }),

  unenroll: (courseId, studentId) =>
    request(`/courses/${courseId}/enrollments/${studentId}`, { method: 'DELETE' }),

  contents: (filters = {}) => {
    const query = new URLSearchParams();
    if (filters.course) query.set('curso', filters.course);
    if (filters.type) query.set('tipo', filters.type);
    if (filters.search) query.set('buscar', filters.search);
    const suffix = query.toString() ? `?${query}` : '';
    return request(`/contents${suffix}`);
  },

  createContent: ({ courseId, title, type, fileUrl, durationSeconds }) =>
    request('/contents', {
      method: 'POST',
      body: {
        idCurso: courseId,
        titulo: title,
        tipo: type,
        urlArchivo: fileUrl || null,
        duracionSeg: durationSeconds || null,
      },
    }),

  transcription: (contentId) => request(`/contents/${contentId}/transcription`),
  enrollments: (courseId) => request(`/courses/${courseId}/enrollments`),

  // Asistente educativo. idContenido es opcional: si se envia, la respuesta se
  // apoya en la transcripcion de esa clase.
  askTutor: ({ question, contentId }) =>
    request('/tutor/ask', {
      method: 'POST',
      body: { pregunta: question, idContenido: contentId ?? null },
    }),

  consultations: ({ contentId } = {}) => {
    const query = contentId ? `?contenido=${contentId}` : '';
    return request(`/tutor/consultations${query}`);
  },
};
