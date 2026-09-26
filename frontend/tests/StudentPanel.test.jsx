// Pruebas del panel del estudiante.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import StudentPanel from '../src/pages/StudentPanel';
import { AuthProvider } from '../src/context/AuthContext';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: { courses: vi.fn(), profile: vi.fn() },
  };
});

const USUARIO = { id_usuario: 6, nombre_completo: 'Pedro López', rol: 'estudiante' };

function montar() {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario: USUARIO });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StudentPanel />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Panel del estudiante', () => {
  beforeEach(() => vi.clearAllMocks());

  test('anuncia la carga en lugar de dejar la pantalla muda', async () => {
    api.courses.mockReturnValue(new Promise(() => {}));
    montar();

    const aviso = await screen.findByText(/cargando sus cursos/i);
    // aria-live es lo que hace que el lector de pantalla lo anuncie.
    expect(aviso).toHaveAttribute('aria-live', 'polite');
  });

  test('lista los cursos con su docente y sus materiales', async () => {
    api.courses.mockResolvedValue({
      cursos: [{
        id_curso: 1, nombre: 'Matemática I', grado: 'Primero Básico',
        ciclo_escolar: 2026, docente: 'Ana Pérez', contenidos: 3, inscritos: 5,
      }],
    });
    montar();

    // El enlace lleva el nombre del curso, no un "ver más": quien recorre los
    // enlaces con lector de pantalla necesita saber a dónde va cada uno.
    const enlace = await screen.findByRole('link', { name: /matemática i/i });
    expect(enlace).toHaveAttribute('href', '/cursos/1');
    expect(screen.getByText(/ana pérez/i)).toBeInTheDocument();
    expect(screen.getByText(/3 materiales disponibles/i)).toBeInTheDocument();
  });

  test('el singular se escribe en singular', async () => {
    api.courses.mockResolvedValue({
      cursos: [{ id_curso: 1, nombre: 'Ciencias', grado: 'X', ciclo_escolar: 2026, docente: 'Luis', contenidos: 1 }],
    });
    montar();

    expect(await screen.findByText(/^1 material disponible$/i)).toBeInTheDocument();
  });

  test('un listado vacío explica por qué lo está', async () => {
    api.courses.mockResolvedValue({ cursos: [] });
    montar();

    // "No hay datos" dejaría al estudiante sin saber si falló algo.
    expect(await screen.findByText(/todavía no tiene cursos/i)).toBeInTheDocument();
    expect(screen.getByText(/cuando su docente lo inscriba/i)).toBeInTheDocument();
  });

  test('un fallo se anuncia como alerta y permite reintentar', async () => {
    api.courses.mockRejectedValue(Object.assign(new Error('No se pudo conectar'), { status: 0 }));
    const usuario = userEvent.setup();
    montar();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/no se pudo conectar/i);

    api.courses.mockResolvedValue({ cursos: [] });
    await usuario.click(screen.getByRole('button', { name: /intentar de nuevo/i }));

    expect(await screen.findByText(/todavía no tiene cursos/i)).toBeInTheDocument();
  });

  test('la jerarquía de encabezados es correcta', async () => {
    api.courses.mockResolvedValue({
      cursos: [{ id_curso: 1, nombre: 'Matemática I', grado: 'X', ciclo_escolar: 2026, docente: 'Ana', contenidos: 0 }],
    });
    montar();

    // Un h1 por página y los cursos como h2: los lectores de pantalla navegan
    // por encabezados, y saltarse niveles desorienta.
    expect(await screen.findByRole('heading', { level: 1, name: /mis cursos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /matemática i/i })).toBeInTheDocument();
  });
});
