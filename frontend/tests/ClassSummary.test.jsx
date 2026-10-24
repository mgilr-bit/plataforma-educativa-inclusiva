// Pruebas del resumen de la clase.
//
// Es lo que convierte la transcripción en algo legible para un estudiante que
// lee español como segunda lengua. Si falla, le queda el texto crudo de un
// docente hablando a 165 palabras por minuto.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassSummary from '../src/components/ClassSummary';
import { api } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: {
      summaries: vi.fn(), createSummary: vi.fn(),
      updateSummary: vi.fn(), deleteSummary: vi.fn(),
    },
  };
});

const BASICO = {
  id_resumen: 1,
  nivel_simplificacion: 'basico',
  texto_resumen: `## De que trata
La clase explica el ciclo del agua.

## Lo importante
- El agua siempre se mueve.
- El ciclo tiene cuatro etapas.

## Palabras nuevas
ciclo: algo que pasa una y otra vez
vapor: agua en forma de aire caliente`,
};

const AVANZADO = {
  id_resumen: 2,
  nivel_simplificacion: 'avanzado',
  texto_resumen: '## De que trata\nLa clase aborda el ciclo hidrológico y sus cuatro etapas.',
};

function montar(props = {}) {
  render(
    <ClassSummary
      contentId={9}
      puedeGestionar={false}
      tieneTranscripcion
      {...props}
    />
  );
}

describe('Resumen de la clase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.summaries.mockResolvedValue({ resumenes: [BASICO] });
  });

  test('se pinta con estructura, no como un párrafo corrido', async () => {
    montar();

    // Encabezados y listas de verdad: así un lector de pantalla salta de
    // sección en sección en vez de leerlo todo de corrido.
    expect(await screen.findByRole('heading', { name: 'De que trata' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lo importante' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('el glosario se marca como definiciones', async () => {
    const { container } = render(
      <ClassSummary contentId={9} puedeGestionar={false} tieneTranscripcion />
    );
    await screen.findByRole('heading', { name: 'Palabras nuevas' });

    // Una lista de definiciones se anuncia como tal; en un párrafo, "ciclo:
    // algo que pasa una y otra vez" se leería como una frase cualquiera.
    const definiciones = container.querySelectorAll('dl dt');
    expect([...definiciones].map((d) => d.textContent)).toEqual(['ciclo', 'vapor']);
  });

  test('al estudiante no se le ofrece generar ni corregir', async () => {
    montar();
    await screen.findByRole('heading', { name: 'De que trata' });

    expect(screen.queryByRole('button', { name: /generar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /corregir/i })).not.toBeInTheDocument();
  });

  test('sin resumen, al estudiante no se le enseña un hueco', async () => {
    api.summaries.mockResolvedValue({ resumenes: [] });
    const { container } = render(
      <ClassSummary contentId={9} puedeGestionar={false} tieneTranscripcion />
    );

    // Hay que esperar a que la carga termine: mientras carga el componente no
    // pinta nada, así que comprobarlo antes pasaría siempre, incluso con el
    // cartel puesto.
    await waitFor(() => expect(api.summaries).toHaveBeenCalledWith(9));
    await act(async () => {});

    // Un cartel de "todavía no hay resumen" solo le quita sitio a la clase.
    expect(container).toBeEmptyDOMElement();
  });

  test('con dos niveles, el estudiante elige cómo leerlo', async () => {
    api.summaries.mockResolvedValue({ resumenes: [BASICO, AVANZADO] });
    const usuario = userEvent.setup();
    montar();

    const facil = await screen.findByRole('button', { name: 'Fácil de leer' });
    expect(facil).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('La clase explica el ciclo del agua.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Con detalle' }));

    expect(screen.getByText(/ciclo hidrológico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Con detalle' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('con un solo nivel no se ofrece elegir', async () => {
    montar();
    await screen.findByRole('heading', { name: 'De que trata' });
    expect(screen.queryByRole('button', { name: 'Fácil de leer' })).not.toBeInTheDocument();
  });

  test('el docente genera un resumen que falta', async () => {
    api.createSummary.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    montar({ puedeGestionar: true });

    await screen.findByRole('heading', { name: 'De que trata' });
    await usuario.selectOptions(screen.getByLabelText(/generar un resumen/i), 'medio');
    await usuario.click(screen.getByRole('button', { name: 'Generar' }));

    expect(api.createSummary).toHaveBeenCalledWith(9, 'medio');
  });

  test('no se ofrece generar un nivel que ya existe', async () => {
    api.summaries.mockResolvedValue({ resumenes: [BASICO] });
    montar({ puedeGestionar: true });

    await screen.findByRole('heading', { name: 'De que trata' });
    const opciones = [...screen.getByLabelText(/generar un resumen/i).options].map((o) => o.value);
    // Ofrecerlo terminaría en un 409 del servidor después de hacerle esperar.
    expect(opciones).not.toContain('basico');
    expect(opciones).toEqual(['medio', 'avanzado']);
  });

  test('sin transcripción se explica por qué no se puede resumir', async () => {
    api.summaries.mockResolvedValue({ resumenes: [] });
    montar({ puedeGestionar: true, tieneTranscripcion: false });

    expect(await screen.findByText(/genere primero la transcripción/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generar' })).not.toBeInTheDocument();
  });

  test('el docente corrige el resumen, porque la máquina también se equivoca', async () => {
    api.updateSummary.mockResolvedValue({ estado: 'ok' });
    const usuario = userEvent.setup();
    montar({ puedeGestionar: true });

    await usuario.click(await screen.findByRole('button', { name: /corregir el resumen «fácil de leer»/i }));

    const campo = screen.getByLabelText(/texto del resumen/i);
    expect(campo).toHaveValue(BASICO.texto_resumen);
    await usuario.clear(campo);
    await usuario.type(campo, 'Resumen corregido a mano');
    await usuario.click(screen.getByRole('button', { name: /guardar el resumen/i }));

    expect(api.updateSummary).toHaveBeenCalledWith(1, 'Resumen corregido a mano');
  });

  test('no se puede dejar el resumen vacío', async () => {
    const usuario = userEvent.setup();
    montar({ puedeGestionar: true });

    await usuario.click(await screen.findByRole('button', { name: /corregir el resumen/i }));
    await usuario.clear(screen.getByLabelText(/texto del resumen/i));
    await usuario.click(screen.getByRole('button', { name: /guardar el resumen/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede quedar vacío/i);
    expect(api.updateSummary).not.toHaveBeenCalled();
  });

  test('si falla la generación, se dice por qué', async () => {
    api.createSummary.mockRejectedValue(new Error('El asistente esta saturado. Intente de nuevo en unos minutos.'));
    const usuario = userEvent.setup();
    montar({ puedeGestionar: true });

    await screen.findByRole('heading', { name: 'De que trata' });
    await usuario.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/saturado/i);
  });
});
