// Pruebas del reproductor con subtitulos.
//
// Es la pieza central de la plataforma: si falla, el contenido de la clase
// deja de ser accesible para el estudiante al que va dirigida.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubtitlePlayer from '../src/components/SubtitlePlayer';

const SUBTITULOS = [
  { id_subtitulo: 1, segmento_texto: 'Buenos días a todos.', tiempo_inicio: '0.000', tiempo_fin: '1.800' },
  { id_subtitulo: 2, segmento_texto: 'Hoy veremos las fracciones', tiempo_inicio: '1.800', tiempo_fin: '7.200' },
  { id_subtitulo: 3, segmento_texto: 'con distinto denominador.', tiempo_inicio: '7.200', tiempo_fin: '12.500' },
];

const VIDEO = { id_contenido: 1, titulo: 'Fracciones', tipo: 'video', url_archivo: 'https://ejemplo.gt/c.mp4' };
const SIN_ARCHIVO = { id_contenido: 2, titulo: 'Apunte', tipo: 'documento', url_archivo: null };

beforeEach(() => {
  // jsdom no implementa estas dos; sin sustituirlas, montar el reproductor falla.
  URL.createObjectURL = vi.fn(() => 'blob:prueba');
  URL.revokeObjectURL = vi.fn();
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

describe('Reproductor con subtítulos', () => {
  test('la transcripción completa está siempre visible', () => {
    render(<SubtitlePlayer content={VIDEO} subtitles={SUBTITULOS} />);

    // No basta con los subtítulos sobre el video: un estudiante sordo puede
    // preferir leer el texto entero a su ritmo, y sin esta lista el contenido
    // solo existiría mientras el video avanza.
    for (const s of SUBTITULOS) {
      expect(screen.getByText(s.segmento_texto)).toBeInTheDocument();
    }
  });

  test('adjunta la pista de subtítulos al reproductor', () => {
    const { container } = render(<SubtitlePlayer content={VIDEO} subtitles={SUBTITULOS} />);

    const pista = container.querySelector('track');
    expect(pista).toHaveAttribute('kind', 'captions');
    expect(pista).toHaveAttribute('srclang', 'es');
    // Por defecto: el estudiante no debería tener que activarlos cada vez.
    expect(pista).toHaveAttribute('default');
  });

  test('cada fragmento es un botón que salta a ese momento', async () => {
    const usuario = userEvent.setup();
    const { container } = render(<SubtitlePlayer content={VIDEO} subtitles={SUBTITULOS} />);
    const video = container.querySelector('video');

    await usuario.click(screen.getByText('con distinto denominador.').closest('button'));

    expect(video.currentTime).toBe(7.2);
  });

  test('el tiempo se anuncia con palabras para el lector de pantalla', () => {
    render(<SubtitlePlayer content={VIDEO} subtitles={SUBTITULOS} />);

    // "0:07" a secas no dice qué es ni qué pasa al pulsarlo.
    expect(screen.getByText(/ir al minuto 0:07/i)).toBeInTheDocument();
  });

  test('sin archivo reproducible, la transcripción sigue siendo legible', () => {
    render(<SubtitlePlayer content={SIN_ARCHIVO} subtitles={SUBTITULOS} />);

    expect(screen.getByText(/no tiene archivo para reproducir/i)).toBeInTheDocument();
    expect(screen.getByText('Hoy veremos las fracciones')).toBeInTheDocument();
    // Sin medio no hay a dónde saltar: no se ofrecen botones que no harían nada.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  test('si el archivo falla, se avisa y el texto sigue disponible', () => {
    const { container } = render(<SubtitlePlayer content={VIDEO} subtitles={SUBTITULOS} />);

    fireEvent.error(container.querySelector('video'));

    expect(screen.getByRole('status')).toHaveTextContent(/no se pudo reproducir/i);
    expect(screen.getByText('Buenos días a todos.')).toBeInTheDocument();
  });

  test('el audio se reproduce con elemento de audio, no de video', () => {
    const { container } = render(
      <SubtitlePlayer content={{ ...VIDEO, tipo: 'audio' }} subtitles={SUBTITULOS} />
    );

    expect(container.querySelector('audio')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  test('la transcripción es una lista ordenada, no párrafos sueltos', () => {
    render(<SubtitlePlayer content={VIDEO} subtitles={SUBTITULOS} />);

    // Una lista permite al lector de pantalla anunciar cuántos fragmentos hay
    // y navegar entre ellos.
    const lista = screen.getByRole('list', { name: /transcripción/i });
    expect(lista.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
