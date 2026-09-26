// Comprobaciones de criterios concretos de WCAG 2.1 nivel AA.
//
// Se separan de la auditoria de axe porque son criterios que una herramienta
// automatica no puede evaluar: requieren saber que significa cada pantalla.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import { AuthProvider } from '../src/context/AuthContext';
import Login from '../src/pages/Login';
import UsersAdmin from '../src/pages/UsersAdmin';
import AccessibilityBar from '../src/components/AccessibilityBar';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: { profile: vi.fn(), login: vi.fn(), users: vi.fn(), courses: vi.fn() },
  };
});

const ADMIN = { id_usuario: 1, nombre_completo: 'Milton Gil', rol: 'administrador' };

// Sin sesion iniciada: con token guardado, el inicio de sesion redirige y no
// habria formulario que recorrer.
function montarSinSesion(componente) {
  window.localStorage.clear();
  return render(
    <MemoryRouter>
      <PreferencesProvider>
        <AuthProvider>{componente}</AuthProvider>
      </PreferencesProvider>
    </MemoryRouter>
  );
}

function montar(componente) {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario: ADMIN });
  return render(
    <MemoryRouter>
      <PreferencesProvider>
        <AuthProvider>{componente}</AuthProvider>
      </PreferencesProvider>
    </MemoryRouter>
  );
}

describe('2.4.2 Cada pantalla tiene su propio título', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.users.mockResolvedValue({ usuarios: [], paginacion: { total: 0, pagina: 1, limite: 20, paginas: 0 } });
    document.title = '';
  });

  test('el inicio de sesión se identifica en el título', async () => {
    montar(<Login />);
    await waitFor(() => expect(document.title).toMatch(/iniciar sesión/i));
  });

  test('la gestión de usuarios también', async () => {
    montar(<UsersAdmin />);
    await waitFor(() => expect(document.title).toMatch(/^usuarios/i));
  });

  test('lo propio de la pantalla va primero', async () => {
    montar(<Login />);
    // En una pestaña estrecha solo se ven los primeros caracteres: ahí debe
    // estar lo que distingue una pantalla de otra.
    await waitFor(() => expect(document.title.startsWith('Iniciar sesión')).toBe(true));
    expect(document.title).toMatch(/plataforma educativa inclusiva/i);
  });
});

describe('2.1.1 y 2.4.3 Todo se alcanza con teclado, en orden', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';
  });

  test('el formulario se recorre en el orden en que se lee', async () => {
    const usuario = userEvent.setup();
    montarSinSesion(<Login />);

    await usuario.tab();
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveFocus();

    await usuario.tab();
    expect(screen.getByLabelText(/contraseña/i)).toHaveFocus();

    await usuario.tab();
    expect(screen.getByRole('button', { name: /entrar/i })).toHaveFocus();
  });

  test('los controles de accesibilidad son una sola parada del tabulador', async () => {
    const usuario = userEvent.setup();
    montarSinSesion(<AccessibilityBar />);

    await usuario.tab();
    // Con radios nativos, el grupo entero es una parada y se recorre con
    // flechas. Con botones sueltos habría que tabular tres veces.
    expect(screen.getByRole('radio', { name: /^normal$/i })).toHaveFocus();

    await usuario.tab();
    expect(screen.getByRole('button', { name: /alto contraste/i })).toHaveFocus();
  });

  test('las flechas recorren los tamaños de letra', async () => {
    const usuario = userEvent.setup();
    montarSinSesion(<AccessibilityBar />);

    await usuario.tab();
    await usuario.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: /^grande$/i })).toBeChecked();
    expect(document.documentElement.style.getPropertyValue('--escala-texto')).toBe('1.25');
  });

  test('no hay trampas de foco: se puede seguir tabulando', async () => {
    const usuario = userEvent.setup();
    montarSinSesion(<Login />);

    // Se recorre el formulario entero y se comprueba que el foco sale de él.
    for (let i = 0; i < 6; i += 1) {
      await usuario.tab();
    }
    expect(document.activeElement).not.toBe(screen.getByLabelText(/correo electrónico/i));
  });
});

describe('1.4.4 El texto se puede ampliar sin perder funcionalidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.style.removeProperty('--escala-texto');
  });

  test('la escala llega al 150 %, el mínimo que exige el criterio', async () => {
    const usuario = userEvent.setup();
    montarSinSesion(<AccessibilityBar />);

    await usuario.click(screen.getByRole('radio', { name: /muy grande/i }));

    // WCAG 1.4.4 exige poder llegar al 200 % del tamaño; el navegador aporta
    // su propio zoom, y esta escala se suma a él.
    expect(document.documentElement.style.getPropertyValue('--escala-texto')).toBe('1.5');
  });

  test('todo el tamaño de letra deriva de esa escala', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    // Vitest se ejecuta desde la raiz del frontend.
    const tokens = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

    // Si un tamaño se escribiera en píxeles fijos, ese texto no crecería y el
    // criterio se incumpliría solo en esa parte de la interfaz.
    const tamanos = tokens.match(/--texto-[a-z-]+:.*/g) || [];
    for (const linea of tamanos) {
      expect(linea).toMatch(/var\(--escala-texto\)/);
    }
    expect(tamanos.length).toBeGreaterThan(3);
  });
});
