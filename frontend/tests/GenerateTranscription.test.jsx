// Pruebas del botón para generar la transcripción.
//
// Es el eslabón que une subir la clase con que el estudiante pueda leerla:
// sin él, el material queda subido pero inservible para quien no oye.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenerateTranscription from '../src/components/GenerateTranscription';
import { puedeGenerar } from '../src/utils/transcripcion';
import { AuthProvider } from '../src/context/AuthContext';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return { ...real, api: { profile: vi.fn(), transcribe: vi.fn() } };
});

const TITULAR = { id_usuario: 3, nombre_completo: 'Luis Morales', rol: 'docente' };
const AJENO = { id_usuario: 2, nombre_completo: 'Ana Pérez', rol: 'docente' };
const ESTUDIANTE = { id_usuario: 6, nombre_completo: 'Pedro López', rol: 'estudiante' };
const ADMIN = { id_usuario: 1, nombre_completo: 'Milton Gil', rol: 'administrador' };

const AUDIO = {
  id_contenido: 9,
  id_docente: 3,
  titulo: 'El ciclo del agua',
  tipo: 'audio',
  url_archivo: '/archivos/05da8fc7.m4a',
};

describe('Quién puede generar la transcripción', () => {
  test('el docente titular del curso, si el audio está guardado', () => {
    expect(puedeGenerar(TITULAR, AUDIO)).toBe(true);
  });

  test('el administrador también', () => {
    expect(puedeGenerar(ADMIN, AUDIO)).toBe(true);
  });

  test('un docente ajeno al curso no', () => {
    // El backend lo rechaza con 403; ofrecérselo sería invitarlo a un error.
    expect(puedeGenerar(AJENO, AUDIO)).toBe(false);
  });

  test('el estudiante no', () => {
    expect(puedeGenerar(ESTUDIANTE, AUDIO)).toBe(false);
  });

  test('un documento no, porque no hay voz que transcribir', () => {
    expect(puedeGenerar(TITULAR, { ...AUDIO, tipo: 'documento' })).toBe(false);
  });

  test('un material sin archivo no', () => {
    expect(puedeGenerar(TITULAR, { ...AUDIO, url_archivo: null })).toBe(false);
  });

  test('un enlace de otro sitio no', () => {
    // El servidor lee el archivo de su propio disco: no puede descargarlo de
    // archive.org, y el botón terminaría siempre en error.
    const externo = { ...AUDIO, url_archivo: 'https://archive.org/download/clase.mp4' };
    expect(puedeGenerar(TITULAR, externo)).toBe(false);
  });
});

function montar(usuario, content = AUDIO, onGenerated = vi.fn()) {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario });
  render(
    <AuthProvider>
      <GenerateTranscription content={content} onGenerated={onGenerated} />
    </AuthProvider>
  );
  return onGenerated;
}

describe('Botón para generar la transcripción', () => {
  beforeEach(() => vi.clearAllMocks());

  test('el docente titular lo ve, y se le dice cuánto tarda antes de pulsarlo', async () => {
    montar(TITULAR);

    const boton = await screen.findByRole('button', { name: /generar transcripción/i });
    // Sin avisar de la espera, el docente cree que se colgó y recarga.
    expect(boton).toHaveAccessibleDescription(/tarda más o menos un minuto/i);
  });

  test('al estudiante no se le ofrece', async () => {
    montar(ESTUDIANTE);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /generar transcripción/i })).not.toBeInTheDocument();
    });
  });

  test('al pulsarlo, pide la transcripción y avisa a la pantalla', async () => {
    api.transcribe.mockResolvedValue({ estado: 'ok', subtitulos: 10 });
    const usuario = userEvent.setup();
    const onGenerated = montar(TITULAR);

    await usuario.click(await screen.findByRole('button', { name: /generar transcripción/i }));

    expect(api.transcribe).toHaveBeenCalledWith(9);
    // La pantalla es la que sabe recargar y llevar el foco a la transcripción.
    await waitFor(() => expect(onGenerated).toHaveBeenCalled());
  });

  test('mientras genera, lo anuncia sin interrumpir y no deja pulsar dos veces', async () => {
    let resolver;
    api.transcribe.mockReturnValue(new Promise((r) => { resolver = r; }));
    const usuario = userEvent.setup();
    montar(TITULAR);

    const boton = await screen.findByRole('button', { name: /generar transcripción/i });
    await usuario.click(boton);

    // Dos llamadas serían dos cobros de Whisper por la misma clase.
    expect(boton).toBeDisabled();
    const aviso = screen.getByText(/esto puede tardar un momento/i);
    expect(aviso).toHaveAttribute('aria-live', 'polite');

    resolver({ estado: 'ok' });
  });

  test('si falla, lo explica y no da la transcripción por hecha', async () => {
    api.transcribe.mockRejectedValue(
      new Error('El servicio de transcripcion no tiene saldo disponible. Avise al administrador de la plataforma.')
    );
    const usuario = userEvent.setup();
    const onGenerated = montar(TITULAR);

    await usuario.click(await screen.findByRole('button', { name: /generar transcripción/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no tiene saldo disponible/i);
    // Recargar aquí mostraría otra vez la pantalla vacía, sin decir por qué.
    expect(onGenerated).not.toHaveBeenCalled();
    // Y se puede reintentar: el fallo puede ser pasajero.
    expect(screen.getByRole('button', { name: /generar transcripción/i })).toBeEnabled();
  });
});
