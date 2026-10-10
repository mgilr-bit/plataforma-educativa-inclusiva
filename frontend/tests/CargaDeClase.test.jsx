// Pruebas de la carga de una clase.
//
// Es lo que más hace un docente, y encadena tres servicios: subir el archivo,
// transcribirlo con Whisper y resumirlo con Claude. Si el encadenado falla a
// la mitad, lo importante es que la clase no se pierda.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NewContent from '../src/pages/NewContent';
import { AuthProvider } from '../src/context/AuthContext';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: {
      profile: vi.fn(), courses: vi.fn(),
      createContent: vi.fn(), transcribe: vi.fn(), createSummary: vi.fn(),
    },
  };
});

const DOCENTE = { id_usuario: 3, nombre_completo: 'Luis Morales', rol: 'docente' };
const CURSOS = [{ id_curso: 3, nombre: 'Ciencias Naturales', grado: 'Segundo Básico' }];

function montar(usuario = DOCENTE) {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario });
  api.courses.mockResolvedValue({ cursos: CURSOS });
  render(
    <MemoryRouter>
      <AuthProvider><NewContent /></AuthProvider>
    </MemoryRouter>
  );
}

async function llenarYPublicar(usuario) {
  await screen.findByLabelText(/título de la clase/i);
  await usuario.type(screen.getByLabelText(/título de la clase/i), 'El ciclo del agua');
  const archivo = new File(['audio'], 'clase.m4a', { type: 'audio/mp4' });
  await usuario.upload(screen.getByLabelText(/elija el archivo/i), archivo);
  await usuario.click(screen.getByRole('button', { name: 'Publicar' }));
}

describe('Carga de una clase', () => {
  beforeEach(() => vi.clearAllMocks());

  test('el archivo se puede elegir con teclado, no solo arrastrando', async () => {
    montar();
    // Arrastrar es un atajo; quien no puede usar el ratón con precisión tiene
    // que poder elegir el archivo igual.
    const campo = await screen.findByLabelText(/elija el archivo de la clase/i);
    expect(campo).toHaveAttribute('type', 'file');
    expect(campo).not.toBeDisabled();
  });

  test('no publica sin título', async () => {
    const usuario = userEvent.setup();
    montar();

    await screen.findByLabelText(/título de la clase/i);
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText(/escriba un título/i)).toBeInTheDocument();
    expect(api.createContent).not.toHaveBeenCalled();
  });

  test('al publicar se encadena solo: sube, transcribe y resume', async () => {
    api.createContent.mockResolvedValue({ contenido: { id_contenido: 9, titulo: 'El ciclo del agua' } });
    api.transcribe.mockResolvedValue({ subtitulos: 12 });
    api.createSummary.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    montar();

    await llenarYPublicar(usuario);

    // Antes había que acordarse de pulsar tres botones en tres sitios.
    await waitFor(() => expect(api.transcribe).toHaveBeenCalledWith(9));
    await waitFor(() => expect(api.createSummary).toHaveBeenCalledWith(9, 'basico'));
    expect(await screen.findByText(/quedó publicada/i)).toBeInTheDocument();
  });

  test('el estado de cada paso se dice con palabras, no solo con el color', async () => {
    api.createContent.mockResolvedValue({ contenido: { id_contenido: 9, titulo: 'Clase' } });
    api.transcribe.mockResolvedValue({ subtitulos: 12 });
    api.createSummary.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    montar();

    await llenarYPublicar(usuario);

    // Quien no distingue el verde del gris necesita leerlo.
    await waitFor(() => {
      expect(screen.getByText('12 fragmentos')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Completado').length).toBeGreaterThan(0);
  });

  test('si falla la transcripción, la clase no se pierde', async () => {
    api.createContent.mockResolvedValue({ contenido: { id_contenido: 9, titulo: 'Clase' } });
    api.transcribe.mockRejectedValue(new Error('El servicio de transcripcion no tiene saldo disponible.'));
    const usuario = userEvent.setup();
    montar();

    await llenarYPublicar(usuario);

    // Ya está guardada: lo que falte se genera después desde su pantalla.
    expect(await screen.findByText(/quedó publicada/i)).toBeInTheDocument();
    expect(await screen.findByText(/no tiene saldo disponible/i)).toBeInTheDocument();
    // Y no se intenta resumir sin texto del que partir.
    expect(api.createSummary).not.toHaveBeenCalled();
  });

  test('si falla la subida, se avisa y no se encadena nada', async () => {
    api.createContent.mockRejectedValue(new Error('El archivo excede el limite de 200 MB'));
    const usuario = userEvent.setup();
    montar();

    await llenarYPublicar(usuario);

    expect(await screen.findByRole('alert')).toHaveTextContent(/excede el limite/i);
    expect(api.transcribe).not.toHaveBeenCalled();
  });

  test('un documento no pasa por transcripción ni resumen', async () => {
    api.createContent.mockResolvedValue({ contenido: { id_contenido: 9, titulo: 'Guía' } });
    const usuario = userEvent.setup();
    montar();

    await screen.findByLabelText(/título de la clase/i);
    await usuario.type(screen.getByLabelText(/título de la clase/i), 'Guía de ejercicios');
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'documento');

    // De un PDF no se saca voz; prometerlo sería mentir.
    expect(screen.getAllByText(/solo para audio y video/i).length).toBe(3);

    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(api.createContent).toHaveBeenCalled());
    expect(api.transcribe).not.toHaveBeenCalled();
  });

  test('al estudiante no se le ofrece esta pantalla', async () => {
    montar({ id_usuario: 6, nombre_completo: 'Pedro', rol: 'estudiante' });
    expect(await screen.findByText(/solo el docente puede cargar clases/i)).toBeInTheDocument();
  });
});
