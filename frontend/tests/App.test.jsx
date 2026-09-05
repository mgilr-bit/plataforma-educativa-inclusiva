// Prueba de humo de la aplicacion completa.
//
// Monta App de verdad, con sus proveedores y su enrutado. Sirve para detectar
// errores de ejecucion que no aparecen al construir: una importacion mal
// escrita o un hook fuera de sitio dejan la pagina en blanco sin que el
// compilador diga nada.
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: { health: vi.fn().mockResolvedValue({ rolesRegistrados: 3 }), profile: vi.fn() },
  };
});

describe('Aplicación', () => {
  test('se monta sin errores y muestra la portada', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /plataforma educativa inclusiva/i })).toBeInTheDocument();
  });

  test('muestra el enlace para saltar al contenido', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toBeInTheDocument();
  });
});
