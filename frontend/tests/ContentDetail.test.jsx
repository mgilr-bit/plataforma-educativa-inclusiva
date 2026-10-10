// Pruebas de la pantalla de un material.
//
// Es donde se junta todo: el archivo de la clase, su transcripción, los
// subtítulos y el asistente. Lo que aquí falte, al estudiante le falta.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ContentDetail from '../src/pages/ContentDetail';
import { AuthProvider } from '../src/context/AuthContext';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: {
      profile: vi.fn(),
      contents: vi.fn(),
      transcription: vi.fn(),
      transcribe: vi.fn(),
      consultations: vi.fn().mockResolvedValue({ consultas: [] }),
      summaries: vi.fn().mockResolvedValue({ resumenes: [] }),
      saveProgress: vi.fn().mockResolvedValue({ estado: 'ok' }),
      createSummary: vi.fn(),
      askTutor: vi.fn(),
    },
  };
});

const TITULAR = { id_usuario: 3, nombre_completo: 'Luis Morales', rol: 'docente' };
const ESTUDIANTE = { id_usuario: 6, nombre_completo: 'Pedro López', rol: 'estudiante' };

const MATERIAL = {
  id_contenido: 9,
  id_curso: 3,
  id_docente: 3,
  curso: 'Ciencias Naturales',
  titulo: 'El ciclo del agua',
  tipo: 'audio',
  url_archivo: '/archivos/05da8fc7.m4a',
};

const TRANSCRIPCION = {
  transcripcion: { id_transcripcion: 1, estado_revision: 'pendiente', texto_completo: 'Hoy hablaremos del ciclo del agua.' },
  subtitulos: [
    { id_subtitulo: 1, segmento_texto: 'Hoy hablaremos del ciclo del agua.', tiempo_inicio: '0.000', tiempo_fin: '5.600' },
  ],
};

function sinTranscripcion() {
  const error = new Error('Este contenido aun no tiene transcripcion');
  error.status = 404;
  return Promise.reject(error);
}

function montar(usuario) {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario });
  api.contents.mockResolvedValue({ contenidos: [MATERIAL] });
  return render(
    <MemoryRouter initialEntries={['/materiales/9']}>
      <AuthProvider>
        <Routes>
          <Route path="/materiales/:id" element={<ContentDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.summaries.mockResolvedValue({ resumenes: [] });
  api.saveProgress.mockResolvedValue({ estado: 'ok' });
  api.consultations.mockResolvedValue({ consultas: [] });
  URL.createObjectURL = vi.fn(() => 'blob:prueba');
  URL.revokeObjectURL = vi.fn();
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

describe('Material sin transcripción', () => {
  test('al estudiante se le explica la espera, sin ofrecerle un botón que no puede usar', async () => {
    api.transcription.mockImplementation(sinTranscripcion);
    montar(ESTUDIANTE);

    expect(await screen.findByText(/todavía no tiene transcripción/i)).toBeInTheDocument();
    expect(screen.getByText(/cuando el docente la genere/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generar transcripción/i })).not.toBeInTheDocument();
  });

  test('al docente titular se le ofrece generarla, y no se le repite el aviso de espera', async () => {
    api.transcription.mockImplementation(sinTranscripcion);
    montar(TITULAR);

    expect(await screen.findByRole('button', { name: /generar transcripción/i })).toBeInTheDocument();
    // Decirle además "cuando el docente la genere" sería hablarle de sí mismo
    // en tercera persona, como si no dependiera de él.
    expect(screen.queryByText(/cuando el docente la genere/i)).not.toBeInTheDocument();
  });

  test('tras generarla, el foco va a la transcripción y no se pierde en la página', async () => {
    api.transcription.mockImplementationOnce(sinTranscripcion);
    api.transcribe.mockResolvedValue({ estado: 'ok', subtitulos: 1 });
    api.transcription.mockResolvedValue(TRANSCRIPCION);
    const usuario = userEvent.setup();
    montar(TITULAR);

    await usuario.click(await screen.findByRole('button', { name: /generar transcripción/i }));

    // El botón que acaba de pulsar desaparece. Sin trasladar el foco, quien
    // navega con teclado vuelve al principio del documento.
    // Se comprueba que el foco esté EN la región, no que el documento la
    // contenga: con document.body enfocado eso también sería cierto, y la
    // prueba pasaría con el traslado de foco roto.
    // El panel del material es lo que recibe el foco: dentro está la pestaña
    // de la transcripción, ya abierta porque antes no había ninguna.
    const region = await screen.findByRole('region', { name: 'Material de la clase' });
    await waitFor(() => {
      expect(region).toHaveFocus();
    });
  });
});
