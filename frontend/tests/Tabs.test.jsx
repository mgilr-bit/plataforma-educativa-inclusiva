// Pruebas de las pestañas.
//
// Un grupo de botones cualquiera no es una pestaña: con lector de pantalla no
// diría cuántas hay ni cuál está abierta, y con teclado el tabulador obligaría
// a recorrerlas todas para llegar al contenido.
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tabs from '../src/components/Tabs';

const PESTANAS = [
  { id: 'resumen', titulo: 'Resumen', contenido: <p>Texto del resumen</p> },
  { id: 'transcripcion', titulo: 'Transcripción', contenido: <p>Texto de la transcripción</p> },
  { id: 'tutor', titulo: 'Tutor', contenido: <p>Chat del asistente</p> },
];

function montar(props = {}) {
  render(<Tabs etiqueta="Secciones del material" pestanas={PESTANAS} {...props} />);
}

describe('Pestañas', () => {
  test('se anuncian como pestañas, con cuál está abierta', () => {
    montar();

    expect(screen.getByRole('tablist', { name: 'Secciones del material' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tutor' })).toHaveAttribute('aria-selected', 'false');
  });

  test('el grupo es una sola parada del tabulador', () => {
    montar();

    // Si cada pestaña fuera una parada, quien navega con teclado tendría que
    // recorrerlas todas para alcanzar el contenido.
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Transcripción' })).toHaveAttribute('tabindex', '-1');
  });

  test('las flechas recorren las pestañas y el foco las acompaña', async () => {
    const usuario = userEvent.setup();
    montar();

    const resumen = screen.getByRole('tab', { name: 'Resumen' });
    resumen.focus();
    await usuario.keyboard('{ArrowRight}');

    const transcripcion = screen.getByRole('tab', { name: 'Transcripción' });
    expect(transcripcion).toHaveFocus();
    // Sin que el foco acompañe, la flecha siguiente partiría de la pestaña
    // equivocada.
    expect(transcripcion).toHaveAttribute('aria-selected', 'true');
  });

  test('las flechas dan la vuelta en los extremos', async () => {
    const usuario = userEvent.setup();
    montar();

    screen.getByRole('tab', { name: 'Resumen' }).focus();
    await usuario.keyboard('{ArrowLeft}');

    // Llegar al final desde el principio evita tener que recorrerlas todas.
    expect(screen.getByRole('tab', { name: 'Tutor' })).toHaveFocus();
  });

  test('Inicio y Fin van a los extremos', async () => {
    const usuario = userEvent.setup();
    montar();

    screen.getByRole('tab', { name: 'Resumen' }).focus();
    await usuario.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Tutor' })).toHaveFocus();

    await usuario.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveFocus();
  });

  test('solo se ve el panel de la pestaña abierta', async () => {
    const usuario = userEvent.setup();
    montar();

    expect(screen.getByText('Texto del resumen')).toBeVisible();
    expect(screen.getByText('Texto de la transcripción')).not.toBeVisible();

    await usuario.click(screen.getByRole('tab', { name: 'Transcripción' }));

    expect(screen.getByText('Texto de la transcripción')).toBeVisible();
    expect(screen.getByText('Texto del resumen')).not.toBeVisible();
  });

  test('los paneles ocultos no se desmontan', async () => {
    const usuario = userEvent.setup();
    montar();

    // Si se desmontaran, el chat del asistente perdería lo escrito y volvería
    // a pedir las consultas cada vez que se cambia de pestaña.
    await usuario.click(screen.getByRole('tab', { name: 'Tutor' }));
    expect(screen.getByText('Texto del resumen')).toBeInTheDocument();
  });

  test('cada panel dice de qué pestaña es', () => {
    montar();

    const panel = screen.getByRole('tabpanel');
    const pestana = screen.getByRole('tab', { name: 'Resumen' });
    expect(panel).toHaveAttribute('aria-labelledby', pestana.id);
  });

  test('se puede abrir otra pestaña de entrada', () => {
    montar({ inicial: 'transcripcion' });

    // La pantalla la usa cuando todavía no hay transcripción: ahí está el
    // botón de generarla, y abrir el resumen lo dejaría escondido.
    expect(screen.getByRole('tab', { name: 'Transcripción' })).toHaveAttribute('aria-selected', 'true');
  });

  test('una pestaña que no corresponde se omite sin romper nada', () => {
    // La de Tutor solo existe para el estudiante; al docente se le pasa false.
    render(<Tabs etiqueta="Secciones" pestanas={[PESTANAS[0], PESTANAS[1], false]} />);

    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
