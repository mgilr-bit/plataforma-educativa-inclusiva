// Pruebas del panel del docente y de las acciones que solo el puede realizar.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TeacherPanel from '../src/pages/TeacherPanel';
import RolePanel from '../src/pages/RolePanel';
import NewContentForm from '../src/components/NewContentForm';
import { AuthProvider } from '../src/context/AuthContext';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: {
      courses: vi.fn(), profile: vi.fn(), createContent: vi.fn(),
      enrollments: vi.fn(), users: vi.fn(), createCourse: vi.fn(),
    },
  };
});

function montar(componente, usuario) {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario });
  return render(
    <MemoryRouter>
      <AuthProvider>{componente}</AuthProvider>
    </MemoryRouter>
  );
}

const DOCENTE = { id_usuario: 2, nombre_completo: 'Ana Pérez', rol: 'docente' };
const ESTUDIANTE = { id_usuario: 6, nombre_completo: 'Pedro López', rol: 'estudiante' };

describe('Panel del docente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.users.mockResolvedValue({ usuarios: [] });
  });

  test('muestra los cursos con inscritos y materiales', async () => {
    api.courses.mockResolvedValue({
      cursos: [{
        id_curso: 1, nombre: 'Matemática I', grado: 'Primero Básico',
        ciclo_escolar: 2026, docente: 'Ana Pérez', inscritos: 5, contenidos: 3,
      }],
    });
    montar(<TeacherPanel />, DOCENTE);

    expect(await screen.findByRole('link', { name: /matemática i/i })).toBeInTheDocument();
    // Se escribe la cifra con su palabra: un "5" suelto no dice de qué.
    expect(screen.getByText(/5 estudiantes inscritos · 3 materiales publicados/i)).toBeInTheDocument();
  });

  test('el singular se escribe en singular', async () => {
    api.courses.mockResolvedValue({
      cursos: [{ id_curso: 1, nombre: 'Ciencias', grado: 'X', ciclo_escolar: 2026, docente: 'Ana', inscritos: 1, contenidos: 1 }],
    });
    montar(<TeacherPanel />, DOCENTE);

    expect(await screen.findByText(/1 estudiante inscrito · 1 material publicado/i)).toBeInTheDocument();
  });

  test('sin cursos, explica quién los asigna', async () => {
    api.courses.mockResolvedValue({ cursos: [] });
    montar(<TeacherPanel />, DOCENTE);

    expect(await screen.findByText(/todavía no tiene cursos asignados/i)).toBeInTheDocument();
    expect(screen.getByText(/el administrador de la plataforma/i)).toBeInTheDocument();
  });
});

describe('Elección de panel según el rol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.users.mockResolvedValue({ usuarios: [] });
  });

  test('el estudiante recibe su panel', async () => {
    api.courses.mockResolvedValue({ cursos: [] });
    montar(<RolePanel />, ESTUDIANTE);

    expect(await screen.findByText(/todavía no tiene cursos$/i)).toBeInTheDocument();
  });

  test('el docente recibe el suyo', async () => {
    api.courses.mockResolvedValue({ cursos: [] });
    montar(<RolePanel />, DOCENTE);

    expect(await screen.findByText(/todavía no tiene cursos asignados/i)).toBeInTheDocument();
  });

  test('el administrador recibe el panel de cursos, con alta incluida', async () => {
    api.courses.mockResolvedValue({ cursos: [] });
    montar(<RolePanel />, { ...DOCENTE, rol: 'administrador' });

    // Y con el mensaje que le corresponde: decirle que espere al
    // administrador no tendría sentido, porque lo es.
    expect(await screen.findByRole('heading', { name: /crear curso/i })).toBeInTheDocument();
    expect(await screen.findByText(/todavía no hay cursos/i)).toBeInTheDocument();
  });
});

describe('Alta de material', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.users.mockResolvedValue({ usuarios: [] });
  });

  test('un título vacío se rechaza sin llamar a la API', async () => {
    const usuario = userEvent.setup();
    montar(<NewContentForm courseId="1" />, DOCENTE);

    await usuario.click(screen.getByRole('button', { name: /agregar material/i }));

    expect(api.createContent).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/título del material/i)).toHaveAttribute('aria-invalid', 'true');
  });

  test('el tipo se elige de una lista, no se escribe a mano', () => {
    montar(<NewContentForm courseId="1" />, DOCENTE);

    // Escribirlo a mano permitiría un tipo que el modelo rechaza.
    const selector = screen.getByLabelText(/tipo de material/i);
    expect(selector.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  test('al guardar, confirma con el nombre de lo creado', async () => {
    api.createContent.mockResolvedValue({ contenido: { id_contenido: 9, titulo: 'Fracciones', tipo: 'video' } });
    const usuario = userEvent.setup();
    montar(<NewContentForm courseId="1" />, DOCENTE);

    await usuario.type(screen.getByLabelText(/título del material/i), 'Fracciones');
    await usuario.click(screen.getByRole('button', { name: /agregar material/i }));

    // role="status" y no "alert": es una confirmación, no una interrupción.
    const confirmacion = await screen.findByRole('status');
    expect(confirmacion).toHaveTextContent(/se agregó "fracciones"/i);
  });

  test('un rechazo de la API se anuncia como alerta', async () => {
    api.createContent.mockRejectedValue(
      Object.assign(new Error('Solo puede cargar contenido en los cursos que imparte'), { status: 403 })
    );
    const usuario = userEvent.setup();
    montar(<NewContentForm courseId="2" />, DOCENTE);

    await usuario.type(screen.getByLabelText(/título del material/i), 'Intruso');
    await usuario.click(screen.getByRole('button', { name: /agregar material/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/solo puede cargar contenido/i);
  });

  test('el formulario se vacía tras guardar, listo para el siguiente', async () => {
    api.createContent.mockResolvedValue({ contenido: { id_contenido: 9, titulo: 'Fracciones' } });
    const usuario = userEvent.setup();
    montar(<NewContentForm courseId="1" />, DOCENTE);

    const campo = screen.getByLabelText(/título del material/i);
    await usuario.type(campo, 'Fracciones');
    await usuario.click(screen.getByRole('button', { name: /agregar material/i }));

    await waitFor(() => expect(campo).toHaveValue(''));
  });
});
