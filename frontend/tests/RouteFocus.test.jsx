// Pruebas del traslado de foco al cambiar de pantalla.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import RouteFocus from '../src/components/RouteFocus';
import App from '../src/App';
import { api } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: { health: vi.fn().mockResolvedValue({ rolesRegistrados: 3 }), profile: vi.fn(), login: vi.fn() },
  };
});

// Doble minimo de la aplicacion: dos pantallas y un enlace entre ellas.
function Aplicacion() {
  const mainRef = useRef(null);
  return (
    <MemoryRouter initialEntries={['/uno']}>
      <RouteFocus targetRef={mainRef} />
      <Link to="/dos">Ir a la segunda</Link>
      <main ref={mainRef} tabIndex={-1}>
        <Routes>
          <Route path="/uno" element={<h1>Primera pantalla</h1>} />
          <Route path="/dos" element={<h1>Segunda pantalla</h1>} />
        </Routes>
      </main>
    </MemoryRouter>
  );
}

describe('Foco al cambiar de pantalla', () => {
  beforeEach(() => vi.clearAllMocks());

  test('en la primera carga no se toca el foco', () => {
    render(<Aplicacion />);
    // Moverlo aquí saltaría el enlace "Saltar al contenido", que debe ser lo
    // primero que encuentre quien navega con teclado.
    expect(document.body).toHaveFocus();
  });

  test('al navegar, el foco pasa al contenido principal', async () => {
    const usuario = userEvent.setup();
    render(<Aplicacion />);

    await usuario.click(screen.getByRole('link', { name: /ir a la segunda/i }));

    // Sin esto, el lector de pantalla seguiría en el enlace pulsado y el
    // estudiante no se enteraría de que cambió de pantalla.
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
    });
    expect(screen.getByRole('heading', { name: /segunda pantalla/i })).toBeInTheDocument();
  });

  test('la aplicación real expone un contenido principal enfocable', () => {
    render(<App />);
    const principal = screen.getByRole('main');
    // tabIndex -1 permite enfocarlo desde el código sin meterlo en el
    // recorrido normal del tabulador.
    expect(principal).toHaveAttribute('tabindex', '-1');
  });
});
