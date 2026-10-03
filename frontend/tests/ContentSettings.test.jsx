// Pruebas de los ajustes de un material.
//
// Un material subido por equivocación tiene que poder arreglarse; lo que no
// puede es desaparecer del todo, porque el progreso de los estudiantes y la
// transcripción cuelgan de él.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentSettings from '../src/components/ContentSettings';
import { api } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return { ...real, api: { updateContent: vi.fn(), deactivateContent: vi.fn() } };
});

const MATERIAL = {
  id_contenido: 9,
  titulo: 'El ciclo del agua',
  tipo: 'audio',
  url_archivo: '/archivos/abc.m4a',
  estado: true,
};

function montar(props = {}) {
  const onUpdated = vi.fn();
  render(
    <ContentSettings
      content={MATERIAL}
      tieneTranscripcion={false}
      onUpdated={onUpdated}
      {...props}
    />
  );
  return onUpdated;
}

describe('Ajustes del material', () => {
  beforeEach(() => vi.clearAllMocks());

  test('corrige el título', async () => {
    api.updateContent.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    const onUpdated = montar();

    const campo = screen.getByLabelText('Título');
    await usuario.clear(campo);
    await usuario.type(campo, 'El ciclo del agua (sexto grado)');
    await usuario.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(api.updateContent).toHaveBeenCalledWith(9, {
      title: 'El ciclo del agua (sexto grado)',
      type: 'audio',
      file: undefined,
    });
    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
  });

  test('no deja el material sin título', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.clear(screen.getByLabelText('Título'));
    await usuario.click(screen.getByRole('button', { name: /guardar cambios/i }));

    // Un material sin nombre es invisible en la lista del estudiante.
    expect(await screen.findByRole('alert')).toHaveTextContent(/necesita un título/i);
    expect(api.updateContent).not.toHaveBeenCalled();
  });

  test('si ya hay transcripción, no se ofrece cambiar el archivo y se explica', () => {
    montar({ tieneTranscripcion: true });

    // Ofrecerlo y fallar después sería peor: el docente ya habría elegido el
    // archivo y esperado la subida.
    expect(screen.queryByLabelText(/cambiar el archivo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/los subtítulos hablarían de un audio distinto/i)).toBeInTheDocument();
  });

  test('sin transcripción sí se puede cambiar el archivo', () => {
    montar();
    expect(screen.getByLabelText(/cambiar el archivo/i)).toBeInTheDocument();
  });

  test('retirar pide confirmación, nombrando el material', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /retirar el material/i }));

    // Se pregunta dentro de la página: el aviso del navegador no se puede
    // redactar en lenguaje sencillo.
    expect(screen.getByText('¿Retirar «El ciclo del agua»?')).toBeInTheDocument();
    expect(api.deactivateContent).not.toHaveBeenCalled();
  });

  test('se puede echar atrás la confirmación', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /retirar el material/i }));
    await usuario.click(screen.getByRole('button', { name: /no, dejarlo/i }));

    expect(api.deactivateContent).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /retirar el material/i })).toBeInTheDocument();
  });

  test('al confirmar, se retira y se dice qué pasó', async () => {
    api.deactivateContent.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    const onUpdated = montar();

    await usuario.click(screen.getByRole('button', { name: /retirar el material/i }));
    await usuario.click(screen.getByRole('button', { name: /sí, retirarlo/i }));

    expect(api.deactivateContent).toHaveBeenCalledWith(9);
    const aviso = await screen.findByText(/los estudiantes ya no lo ven/i);
    expect(aviso).toHaveAttribute('aria-live', 'polite');
    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
  });

  test('explica que retirar no borra nada', () => {
    montar();
    // Sin esto el docente no se atreve a retirar nada, por miedo a perder
    // la transcripción que acaba de corregir.
    expect(screen.getByText(/no se pierde nada/i)).toBeInTheDocument();
  });

  test('un material retirado se puede volver a publicar sin confirmar', async () => {
    api.updateContent.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    montar({ content: { ...MATERIAL, estado: false } });

    expect(screen.getByRole('heading', { name: /material retirado/i })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /volver a publicar/i }));

    // Reponer no destruye nada, así que preguntar dos veces solo estorba.
    expect(api.updateContent).toHaveBeenCalledWith(9, { state: true });
  });

  test('si falla el retiro, se avisa y el material no se da por retirado', async () => {
    api.deactivateContent.mockRejectedValue(new Error('sin conexión'));
    const usuario = userEvent.setup();
    const onUpdated = montar();

    await usuario.click(screen.getByRole('button', { name: /retirar el material/i }));
    await usuario.click(screen.getByRole('button', { name: /sí, retirarlo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sin conexión/i);
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
