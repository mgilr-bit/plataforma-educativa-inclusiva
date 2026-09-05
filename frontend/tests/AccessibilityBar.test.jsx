// Pruebas de los controles de accesibilidad.
//
// Estos controles son el mecanismo por el que un estudiante ajusta la
// interfaz a lo que puede leer. Si se rompen en silencio, la plataforma deja
// de servir a quien fue diseñada.
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibilityBar from '../src/components/AccessibilityBar';
import { PreferencesProvider } from '../src/context/PreferencesContext';

function montar() {
  return render(
    <PreferencesProvider>
      <AccessibilityBar />
    </PreferencesProvider>
  );
}

describe('Barra de accesibilidad', () => {
  test('los tamaños de letra forman un grupo de opciones excluyentes', () => {
    montar();
    const grupo = screen.getByRole('radiogroup', { name: /tamaño de letra/i });
    expect(grupo).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  test('cambiar el tamaño altera la variable que gobierna toda la interfaz', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('radio', { name: /muy grande/i }));

    expect(document.documentElement.style.getPropertyValue('--escala-texto')).toBe('1.5');
    expect(screen.getByRole('radio', { name: /muy grande/i })).toHaveAttribute('aria-checked', 'true');
  });

  test('el alto contraste se anuncia como botón de dos estados', async () => {
    const usuario = userEvent.setup();
    montar();

    const boton = screen.getByRole('button', { name: /alto contraste/i });
    expect(boton).toHaveAttribute('aria-pressed', 'false');

    await usuario.click(boton);

    expect(boton).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('data-contraste')).toBe('alto');
  });

  test('las preferencias sobreviven a recargar la página', async () => {
    const usuario = userEvent.setup();
    const { unmount } = montar();

    await usuario.click(screen.getByRole('button', { name: /alto contraste/i }));
    await usuario.click(screen.getByRole('radio', { name: /^grande$/i }));
    unmount();

    montar();

    expect(screen.getByRole('button', { name: /alto contraste/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: /^grande$/i })).toHaveAttribute('aria-checked', 'true');
  });

  test('funciona sin almacenamiento disponible, como en modo privado', () => {
    const original = window.localStorage.getItem;
    window.localStorage.getItem = () => { throw new Error('bloqueado'); };

    // No debe reventar: cae a los valores por defecto.
    expect(() => montar()).not.toThrow();
    expect(screen.getByRole('button', { name: /alto contraste/i })).toHaveAttribute('aria-pressed', 'false');

    window.localStorage.getItem = original;
  });
});
