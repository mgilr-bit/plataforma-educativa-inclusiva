// Pruebas del reproductor y de la transcripción.
//
// Son la pieza central de la plataforma: si fallan, el contenido de la clase
// deja de ser accesible para el estudiante al que va dirigida. Antes vivían en
// un solo componente; ahora están separadas porque en la pantalla ocupan
// columnas distintas, y comparten estado a través de un hook.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaPlayer from '../src/components/MediaPlayer';
import TranscriptList from '../src/components/TranscriptList';
import useReproductor from '../src/hooks/useReproductor';

const SUBTITULOS = [
  { id_subtitulo: 1, segmento_texto: 'Buenos días a todos.', tiempo_inicio: '0.000', tiempo_fin: '1.800' },
  { id_subtitulo: 2, segmento_texto: 'Hoy veremos las fracciones', tiempo_inicio: '1.800', tiempo_fin: '7.200' },
  { id_subtitulo: 3, segmento_texto: 'con distinto denominador.', tiempo_inicio: '7.200', tiempo_fin: '12.500' },
];

const VIDEO = { id_contenido: 1, titulo: 'Fracciones', tipo: 'video', url_archivo: 'https://ejemplo.gt/c.mp4' };
// Lo que produce una subida real: una ruta relativa al servidor de la API.
const VIDEO_SUBIDO = { id_contenido: 3, titulo: 'Fracciones', tipo: 'video', url_archivo: '/archivos/abc.mp4' };
const AUDIO = { id_contenido: 4, titulo: 'Clase', tipo: 'audio', url_archivo: '/archivos/a.m4a' };
const SIN_ARCHIVO = { id_contenido: 2, titulo: 'Apunte', tipo: 'documento', url_archivo: null };

// Monta las dos piezas juntas, como en la pantalla real: comparten el hook.
function Clase({ content, subtitles = SUBTITULOS }) {
  const reproductor = useReproductor({ content, subtitles });
  return (
    <>
      <MediaPlayer content={content} reproductor={reproductor} />
      <TranscriptList subtitles={subtitles} reproductor={reproductor} />
    </>
  );
}

beforeEach(() => {
  // jsdom no implementa estas tres; sin sustituirlas, montar el reproductor falla.
  URL.createObjectURL = vi.fn(() => 'blob:prueba');
  URL.revokeObjectURL = vi.fn();
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

describe('El reproductor', () => {
  test('adjunta la pista de subtítulos', () => {
    const { container } = render(<Clase content={VIDEO} />);

    // Es lo que hace que el navegador dibuje los subtítulos respetando los
    // ajustes que el usuario ya configuró en su sistema.
    const pista = container.querySelector('track');
    expect(pista).toHaveAttribute('kind', 'captions');
    expect(pista).toHaveAttribute('srclang', 'es');
  });

  test('un archivo subido se pide al servidor de la API, no al de la página', () => {
    const { container } = render(<Clase content={VIDEO_SUBIDO} />);

    // La ruta guardada es relativa a la API. Si se usa tal cual, el navegador
    // la pide al origen de la página, que devuelve el index.html de la
    // aplicación: el reproductor recibe HTML y avisa de que no se pudo
    // reproducir. Le pasaba a todos los archivos subidos.
    expect(container.querySelector('video').getAttribute('src'))
      .toBe('http://localhost:4000/archivos/abc.mp4');
  });

  test('el audio se reproduce con elemento de audio, no de video', () => {
    const { container } = render(<Clase content={AUDIO} />);

    // Un <video> para un audio deja un rectángulo negro inútil ocupando la
    // pantalla.
    expect(container.querySelector('audio')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  test('si el archivo falla, se avisa y el texto sigue disponible', () => {
    const { container } = render(<Clase content={VIDEO} />);

    fireEvent.error(container.querySelector('video'));

    expect(screen.getByRole('status')).toHaveTextContent(/no se pudo reproducir/i);
    // Lo importante: el aviso no se lleva por delante la transcripción.
    expect(screen.getByText('Buenos días a todos.')).toBeInTheDocument();
  });

  test('sin archivo reproducible, la transcripción sigue siendo legible', () => {
    render(<Clase content={SIN_ARCHIVO} />);

    expect(screen.getByText(/no tiene archivo para reproducir/i)).toBeInTheDocument();
    // Sin medio no hay a dónde saltar, así que los fragmentos no son botones.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('con distinto denominador.')).toBeInTheDocument();
  });
});

describe('La transcripción', () => {
  test('está siempre completa, no solo el fragmento que suena', () => {
    render(<Clase content={VIDEO} />);

    // Un estudiante sordo puede preferir leer el texto entero a su ritmo. Sin
    // la lista, el contenido solo existiría mientras el video avanza.
    for (const s of SUBTITULOS) {
      expect(screen.getByText(s.segmento_texto)).toBeInTheDocument();
    }
  });

  test('es una lista ordenada, no párrafos sueltos', () => {
    render(<Clase content={VIDEO} />);

    // El lector de pantalla anuncia cuántos fragmentos hay y por cuál va.
    const lista = screen.getByRole('list', { name: /transcripción/i });
    expect(lista.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  test('cada fragmento salta a ese momento del video', async () => {
    const usuario = userEvent.setup();
    const { container } = render(<Clase content={VIDEO} />);

    await usuario.click(screen.getByRole('button', { name: /con distinto denominador/i }));

    expect(container.querySelector('video').currentTime).toBe(7.2);
  });

  test('el nombre del botón lleva el texto visible tal cual', () => {
    render(<Clase content={VIDEO} />);

    // «Etiqueta en el nombre» (WCAG 2.5.3): quien maneja la plataforma por voz
    // dice lo que ve. Con un aria-label que reordenaba las partes, no acertaba.
    expect(
      screen.getByRole('button', { name: 'Ir al minuto 0:07 con distinto denominador.' })
    ).toBeInTheDocument();
  });
});
