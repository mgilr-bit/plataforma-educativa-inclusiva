// Pruebas de la gestion de usuarios.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UsersAdmin from '../src/pages/UsersAdmin';
import { AuthProvider } from '../src/context/AuthContext';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: {
      profile: vi.fn(), users: vi.fn(), createUser: vi.fn(),
      updateUser: vi.fn(), deactivateUser: vi.fn(),
    },
  };
});

const ADMIN = { id_usuario: 1, nombre_completo: 'Milton Gil', rol: 'administrador' };

const CUENTAS = {
  usuarios: [
    { id_usuario: 2, nombre_completo: 'Ana Pérez', correo: 'ana@umg.edu.gt', rol: 'docente', estado: true },
    { id_usuario: 6, nombre_completo: 'Pedro López', correo: 'pedro@umg.edu.gt', rol: 'estudiante', estado: false },
  ],
  paginacion: { total: 2, pagina: 1, limite: 20, paginas: 1 },
};

function montar() {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario: ADMIN });
  return render(
    <MemoryRouter>
      <AuthProvider><UsersAdmin /></AuthProvider>
    </MemoryRouter>
  );
}

describe('Gestión de usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.users.mockResolvedValue(CUENTAS);
  });

  test('las cuentas se presentan en una tabla con encabezados', async () => {
    montar();
    // Una tabla con encabezados permite al lector de pantalla anunciar, en
    // cada celda, de qué columna se trata. Sin ellos serían datos sueltos.
    const tabla = await screen.findByRole('table', { name: /cuentas registradas/i });
    expect(tabla).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /correo/i })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /ana pérez/i })).toBeInTheDocument();
  });

  test('cada botón dice a quién afecta', async () => {
    montar();
    // "Desactivar" repetido en cada fila no le sirve a quien recorre los
    // botones sin ver la tabla.
    expect(await screen.findByRole('button', { name: /desactivar la cuenta de ana pérez/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reactivar la cuenta de pedro lópez/i })).toBeInTheDocument();
  });

  test('el total de resultados se anuncia', async () => {
    montar();
    const total = await screen.findByText(/2 cuentas encontradas/i);
    expect(total).toHaveAttribute('aria-live', 'polite');
  });

  test('desactivar confirma con el nombre de la persona', async () => {
    api.deactivateUser.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole('button', { name: /desactivar la cuenta de ana pérez/i }));

    await waitFor(() => expect(api.deactivateUser).toHaveBeenCalledWith(2));
    expect(await screen.findByRole('status')).toHaveTextContent(/se desactivó la cuenta de ana pérez/i);
  });

  test('reactivar usa la actualización, no el alta', async () => {
    api.updateUser.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole('button', { name: /reactivar la cuenta de pedro/i }));

    await waitFor(() => expect(api.updateUser).toHaveBeenCalledWith(6, { active: true }));
  });

  test('el alta valida antes de llamar a la API', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole('button', { name: /crear cuenta/i }));

    expect(api.createUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/nombre completo/i)).toHaveAttribute('aria-invalid', 'true');
  });

  test('el alta envía los datos y confirma', async () => {
    api.createUser.mockResolvedValue({ usuario: { id_usuario: 9, nombre_completo: 'Luis Morales' } });
    const usuario = userEvent.setup();
    montar();

    await usuario.type(await screen.findByLabelText(/nombre completo/i), 'Luis Morales');
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'luis@umg.edu.gt');
    await usuario.type(screen.getByLabelText(/contraseña inicial/i), 'Docente456');
    await usuario.selectOptions(screen.getByLabelText(/rol de la cuenta/i), '2');
    await usuario.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledWith({
        fullName: 'Luis Morales', email: 'luis@umg.edu.gt',
        password: 'Docente456', roleId: 2,
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/se creó la cuenta de luis morales/i);
  });

  test('un correo repetido se explica sin jerga', async () => {
    api.createUser.mockRejectedValue(
      Object.assign(new Error('El correo ya esta registrado'), { status: 409 })
    );
    const usuario = userEvent.setup();
    montar();

    await usuario.type(await screen.findByLabelText(/nombre completo/i), 'Ana Pérez');
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'ana@umg.edu.gt');
    await usuario.type(screen.getByLabelText(/contraseña inicial/i), 'Clave12345');
    await usuario.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/el correo ya esta registrado/i);
  });
});

describe('Etiquetas de la pantalla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.users.mockResolvedValue(CUENTAS);
  });

  test('ningún par de controles comparte etiqueta', async () => {
    montar();
    await screen.findByRole('table');

    // Dos controles llamados igual son indistinguibles para quien no ve la
    // pantalla: al tabular oiría "Rol" dos veces sin saber cuál es el filtro.
    const etiquetas = Array.from(document.querySelectorAll('label')).map((l) => l.textContent.trim());
    const repetidas = etiquetas.filter((e, i) => etiquetas.indexOf(e) !== i);
    expect(repetidas).toEqual([]);
  });
});
