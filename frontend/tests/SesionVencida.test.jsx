// Pruebas del manejo de sesion vencida.
//
// El token dura ocho horas. Un estudiante que abre la plataforma por la manana
// y vuelve por la tarde se encuentra con un 401: sin este manejo veria el
// mensaje crudo de la API en mitad de la pantalla, sin entender que solo tiene
// que volver a entrar.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../src/components/ProtectedRoute';
import Login from '../src/pages/Login';
import { AuthProvider } from '../src/context/AuthContext';
import * as cliente from '../src/api/client';

const fetchOriginal = global.fetch;

function responder(status, cuerpo) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(cuerpo),
  });
}

function montar(rutaInicial = '/panel') {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/panel"
            element={<ProtectedRoute><h1>Panel privado</h1></ProtectedRoute>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Sesión vencida', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  test('un 401 en una petición autenticada borra el token guardado', async () => {
    cliente.saveToken('token-vencido');
    responder(401, { mensaje: 'El token ha expirado' });

    await expect(cliente.api.profile()).rejects.toThrow();

    // Conservarlo dejaría a la aplicación reintentando con un token muerto.
    expect(cliente.readToken()).toBeNull();
  });

  test('un 401 al iniciar sesión NO se trata como sesión vencida', async () => {
    cliente.saveToken('token-valido');
    responder(401, { mensaje: 'Credenciales invalidas' });

    await expect(cliente.api.login('a@b.gt', 'mala')).rejects.toThrow();

    // Escribir mal la contraseña no debe cerrar la sesión que ya se tenía.
    expect(cliente.readToken()).toBe('token-valido');
  });

  test('con el token vencido, el usuario acaba en el inicio de sesión', async () => {
    cliente.saveToken('token-vencido');
    responder(401, { mensaje: 'El token ha expirado' });

    montar('/panel');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/panel privado/i)).not.toBeInTheDocument();
  });

  test('se explica por qué se le expulsó, en lugar de dejarlo adivinando', async () => {
    cliente.saveToken('token-vencido');
    responder(401, { mensaje: 'El token ha expirado' });

    montar('/panel');

    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent(/su sesión terminó por seguridad/i);
  });

  test('sin token, se lleva al login sin avisar de nada', async () => {
    montar('/panel');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    });
    // No hubo sesión que vencer: avisar de ello confundiría.
    expect(screen.queryByText(/su sesión terminó/i)).not.toBeInTheDocument();
  });
});
