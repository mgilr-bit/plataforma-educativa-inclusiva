// Pruebas del control de acceso por rol en las rutas.
//
// Ocultar un enlace en la navegacion no impide llegar: basta con escribir la
// direccion. Estas pruebas fijan que la ruta compruebe el rol de verdad.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { AuthProvider } from '../src/context/AuthContext';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return { ...real, api: { profile: vi.fn() } };
});

function montar(usuario, roles) {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario });
  return render(
    <MemoryRouter initialEntries={['/restringida']}>
      <AuthProvider>
        <Routes>
          <Route path="/panel" element={<h1>Mis cursos</h1>} />
          <Route
            path="/restringida"
            element={(
              <ProtectedRoute roles={roles}>
                <h1>Solo administradores</h1>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

const ADMIN = { id_usuario: 1, nombre_completo: 'Milton Gil', rol: 'administrador' };
const ESTUDIANTE = { id_usuario: 6, nombre_completo: 'Pedro López', rol: 'estudiante' };
const DOCENTE = { id_usuario: 2, nombre_completo: 'Ana Pérez', rol: 'docente' };

describe('Control de acceso por rol', () => {
  beforeEach(() => vi.clearAllMocks());

  test('el rol permitido entra', async () => {
    montar(ADMIN, ['administrador']);
    expect(await screen.findByRole('heading', { name: /solo administradores/i })).toBeInTheDocument();
  });

  test('un estudiante que escribe la dirección no ve la pantalla', async () => {
    montar(ESTUDIANTE, ['administrador']);

    expect(await screen.findByRole('heading', { name: /no tiene permiso/i })).toBeInTheDocument();
    expect(screen.queryByText(/solo administradores/i)).not.toBeInTheDocument();
  });

  test('un docente tampoco', async () => {
    montar(DOCENTE, ['administrador']);
    expect(await screen.findByRole('heading', { name: /no tiene permiso/i })).toBeInTheDocument();
  });

  test('se explica el motivo y se ofrece una salida', async () => {
    montar(ESTUDIANTE, ['administrador']);

    // Una pantalla en blanco o un redirigido silencioso dejarían al usuario
    // sin entender qué pasó.
    await screen.findByRole('heading', { name: /no tiene permiso/i });
    expect(screen.getByText(/su cuenta de/i)).toHaveTextContent(/estudiante/i);
    expect(screen.getByRole('link', { name: /volver a mis cursos/i })).toBeInTheDocument();
  });

  test('sin lista de roles, basta con tener sesión', async () => {
    montar(ESTUDIANTE, undefined);
    expect(await screen.findByRole('heading', { name: /solo administradores/i })).toBeInTheDocument();
  });
});
