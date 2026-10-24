// Pruebas de la revisión de la transcripción.
//
// Whisper se equivoca y el estudiante sordo no tiene el audio para notarlo:
// lo que diga el texto es lo que aprende. Si esta pantalla falla, el error se
// queda, y además alimenta los subtítulos y al asistente.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptionReview from '../src/components/TranscriptionReview';
import { enMinutos, enPalabras } from '../src/utils/tiempo';
import { api } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return { ...real, api: { updateSubtitle: vi.fn(), updateTranscription: vi.fn() } };
});

const TRANSCRIPCION = { id_transcripcion: 1, estado_revision: 'pendiente' };

const SUBTITULOS = [
  { id_subtitulo: 10, segmento_texto: 'Hoy veremos las fracciones.', tiempo_inicio: '0.000', tiempo_fin: '5.000', editado_docente: false },
  { id_subtitulo: 11, segmento_texto: 'El mínimo común múltiple.', tiempo_inicio: '65.000', tiempo_fin: '70.000', editado_docente: false },
  { id_subtitulo: 12, segmento_texto: 'Hasta mañana.', tiempo_inicio: '125.000', tiempo_fin: '128.000', editado_docente: true },
];

function montar(onUpdated = vi.fn()) {
  render(
    <TranscriptionReview
      transcription={TRANSCRIPCION}
      subtitles={SUBTITULOS}
      onUpdated={onUpdated}
    />
  );
  return onUpdated;
}

describe('Cómo se nombra un momento de la clase', () => {
  test('en pantalla, corto', () => {
    expect(enMinutos('65.000')).toBe('1:05');
    expect(enMinutos('0.000')).toBe('0:00');
    expect(enMinutos('125.000')).toBe('2:05');
  });

  test('en voz alta, con palabras', () => {
    // Un lector de pantalla lee "1:05" como "uno dos puntos cero cinco", que
    // no sitúa a nadie dentro de la clase.
    expect(enPalabras('65.000')).toBe('el minuto 1 con 5 segundos');
    expect(enPalabras('120.000')).toBe('el minuto 2');
    expect(enPalabras('7.000')).toBe('el segundo 7');
  });
});

describe('Revisión de la transcripción', () => {
  beforeEach(() => vi.clearAllMocks());

  test('explica por qué hay que revisar, no solo que se puede', async () => {
    montar();
    // Sin el porqué, el docente lo trata como un trámite opcional y lo salta.
    expect(screen.getByText(/para un estudiante sordo este texto es la clase/i)).toBeInTheDocument();
  });

  test('cada campo y cada botón dicen a qué fragmento pertenecen', () => {
    montar();

    // Tres campos iguales seguidos son indistinguibles con lector de pantalla.
    expect(screen.getByRole('textbox', { name: /empieza en el segundo 0/i })).toHaveValue('Hoy veremos las fracciones.');
    expect(screen.getByRole('textbox', { name: /empieza en el minuto 1 con 5 segundos/i })).toHaveValue('El mínimo común múltiple.');
    expect(
      screen.getByRole('button', { name: 'Guardar la corrección del fragmento que empieza en el minuto 1 con 5 segundos' })
    ).toBeInTheDocument();
  });

  test('no deja guardar lo que no se ha cambiado', () => {
    montar();
    const boton = screen.getByRole('button', { name: /empieza en el segundo 0/i });
    // Guardar sin cambios marcaría el fragmento como corregido por el docente
    // siendo mentira, y falsearía la cuenta de lo revisado.
    expect(boton).toBeDisabled();
  });

  test('corrige un fragmento y avisa sin interrumpir', async () => {
    api.updateSubtitle.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    const onUpdated = montar();

    const campo = screen.getByRole('textbox', { name: /empieza en el minuto 1 con 5 segundos/i });
    await usuario.clear(campo);
    await usuario.type(campo, 'El mínimo común múltiplo.');
    await usuario.click(
      screen.getByRole('button', { name: /empieza en el minuto 1 con 5 segundos/i })
    );

    expect(api.updateSubtitle).toHaveBeenCalledWith(11, { segmentoTexto: 'El mínimo común múltiplo.' });
    // Recargar es lo que mantiene a la vista la marca de "Corregido" y la
    // cuenta de fragmentos.
    await waitFor(() => expect(onUpdated).toHaveBeenCalled());

    const aviso = await screen.findByText(/se guardó la corrección de el minuto 1 con 5 segundos/i);
    expect(aviso).toHaveAttribute('aria-live', 'polite');
  });

  test('un fragmento no se puede dejar vacío', async () => {
    const usuario = userEvent.setup();
    montar();

    const campo = screen.getByRole('textbox', { name: /empieza en el segundo 0/i });
    await usuario.clear(campo);
    await usuario.click(screen.getByRole('button', { name: /empieza en el segundo 0/i }));

    // Un hueco mudo en los subtítulos es contenido perdido sin aviso para
    // quien no oye, así que ni siquiera se intenta guardar.
    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede quedar vacío/i);
    expect(api.updateSubtitle).not.toHaveBeenCalled();
  });

  test('si falla el guardado, el texto corregido no se pierde', async () => {
    api.updateSubtitle.mockRejectedValue(new Error('sin conexión'));
    const usuario = userEvent.setup();
    montar();

    const campo = screen.getByRole('textbox', { name: /empieza en el segundo 0/i });
    await usuario.clear(campo);
    await usuario.type(campo, 'Texto corregido a mano');
    await usuario.click(screen.getByRole('button', { name: /empieza en el segundo 0/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sin conexión/i);
    // Devolver el campo al texto original obligaría a reescribirlo todo.
    expect(campo).toHaveValue('Texto corregido a mano');
  });

  test('lleva la cuenta de lo revisado', () => {
    montar();
    expect(screen.getByText('1 de 3 fragmentos corregidos.')).toBeInTheDocument();
  });

  test('el estado activo se distingue sin depender del color', async () => {
    montar();
    // aria-pressed lo anuncia el lector de pantalla; el borde grueso lo ve
    // quien no distingue colores.
    expect(screen.getByRole('button', { name: 'Sin revisar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Aprobada' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('marcar la transcripción como aprobada', async () => {
    api.updateTranscription.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: 'Aprobada' }));

    expect(api.updateTranscription).toHaveBeenCalledWith(1, { estadoRevision: 'aprobada' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Aprobada' })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
