// Pruebas de la pantalla de inicio de sesion.
//
// Se consulta por rol y por etiqueta, no por clase CSS: si una prueba encuentra
// el campo "Correo electrónico" por su etiqueta, es porque la etiqueta esta
// correctamente asociada, que es justo lo que necesita un lector de pantalla.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/pages/Login';
import { AuthProvider } from '../src/context/AuthContext';
import { api } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: { login: vi.fn(), profile: vi.fn() },
  };
});

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Pantalla de inicio de sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('los campos son alcanzables por su etiqueta', () => {
    montar();
    // Si esto encuentra los campos, la asociación label/input es correcta.
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  test('los campos declaran autocomplete, para que el gestor de contraseñas funcione', () => {
    montar();
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('autocomplete', 'current-password');
  });

  test('la contraseña se escribe oculta', () => {
    montar();
    expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('type', 'password');
  });

  test('un campo vacío produce un error asociado al campo', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /entrar/i }));

    const campo = screen.getByLabelText(/correo electrónico/i);
    // aria-invalid indica al lector de pantalla que ese campo tiene problema.
    expect(campo).toHaveAttribute('aria-invalid', 'true');

    // Y el mensaje debe estar enlazado por aria-describedby, no suelto.
    const idDescripcion = campo.getAttribute('aria-describedby');
    expect(idDescripcion).toBeTruthy();
    expect(document.getElementById(idDescripcion)).toHaveTextContent(/escriba su correo/i);
  });

  test('el error de credenciales se anuncia como alerta', async () => {
    api.login.mockRejectedValue(
      Object.assign(new Error('Credenciales invalidas'), { status: 401 })
    );
    const usuario = userEvent.setup();
    montar();

    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'ana@umg.edu.gt');
    await usuario.type(screen.getByLabelText(/contraseña/i), 'Docente123');
    await usuario.click(screen.getByRole('button', { name: /entrar/i }));

    // role="alert" es lo que hace que se anuncie sin buscarlo.
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/credenciales invalidas/i);
  });

  test('un fallo de conexión se explica en términos del usuario, no técnicos', async () => {
    api.login.mockRejectedValue(Object.assign(new Error('Failed to fetch'), { status: 0 }));
    const usuario = userEvent.setup();
    montar();

    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'ana@umg.edu.gt');
    await usuario.type(screen.getByLabelText(/contraseña/i), 'Docente123');
    await usuario.click(screen.getByRole('button', { name: /entrar/i }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/revise su conexión/i);
    expect(alerta).not.toHaveTextContent(/fetch/i);
  });

  test('el envío correcto llama a la API con el correo sin espacios', async () => {
    api.login.mockResolvedValue({ token: 'abc', usuario: { rol: 'docente' } });
    const usuario = userEvent.setup();
    montar();

    await usuario.type(screen.getByLabelText(/correo electrónico/i), '  ana@umg.edu.gt  ');
    await usuario.type(screen.getByLabelText(/contraseña/i), 'Docente123');
    await usuario.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('ana@umg.edu.gt', 'Docente123');
    });
  });

  test('el botón se bloquea mientras se envía, para no duplicar el intento', async () => {
    let resolver;
    api.login.mockReturnValue(new Promise((r) => { resolver = r; }));
    const usuario = userEvent.setup();
    montar();

    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'ana@umg.edu.gt');
    await usuario.type(screen.getByLabelText(/contraseña/i), 'Docente123');
    await usuario.click(screen.getByRole('button', { name: /entrar/i }));

    const boton = screen.getByRole('button', { name: /entrando/i });
    expect(boton).toBeDisabled();

    resolver({ token: 'abc', usuario: { rol: 'docente' } });
  });
});
