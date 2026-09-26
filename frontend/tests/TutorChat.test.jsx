// Pruebas del chat con el asistente educativo.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorChat from '../src/components/TutorChat';
import { api } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return { ...real, api: { askTutor: vi.fn(), consultations: vi.fn() } };
});

const HISTORIAL = {
  consultas: [
    { id_consulta: 2, pregunta: '¿Y cómo sumo dos?', respuesta: 'Primero busca el denominador común.' },
    { id_consulta: 1, pregunta: '¿Qué es una fracción?', respuesta: 'Una fracción tiene dos partes.' },
  ],
};

describe('Chat con el asistente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.consultations.mockResolvedValue({ consultas: [] });
  });

  test('la conversación se anuncia sin robar el foco a quien escribe', async () => {
    render(<TutorChat contentId={1} />);

    const registro = await screen.findByRole('log', { name: /conversación/i });
    // "polite" espera a que el lector termine la frase en curso; "assertive"
    // interrumpiría al estudiante mientras escribe.
    expect(registro).toHaveAttribute('aria-live', 'polite');
  });

  test('muestra el historial de la más antigua a la más reciente', async () => {
    api.consultations.mockResolvedValue(HISTORIAL);
    render(<TutorChat contentId={1} />);

    // La API las devuelve al revés; en una conversación se leen en orden.
    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/qué es una fracción/i);
    expect(items[1]).toHaveTextContent(/cómo sumo dos/i);
  });

  test('quién habla se dice con palabras, no por la posición', async () => {
    api.consultations.mockResolvedValue(HISTORIAL);
    render(<TutorChat contentId={1} />);

    expect(await screen.findAllByText(/usted preguntó:/i)).toHaveLength(2);
    expect(screen.getAllByText(/el asistente respondió:/i)).toHaveLength(2);
  });

  test('una pregunta vacía no llega a la API', async () => {
    const usuario = userEvent.setup();
    render(<TutorChat contentId={1} />);

    await usuario.click(await screen.findByRole('button', { name: /enviar pregunta/i }));

    expect(api.askTutor).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/escriba su pregunta/i);
  });

  test('envía la pregunta con el contenido de la clase como contexto', async () => {
    api.askTutor.mockResolvedValue({
      consulta: { id_consulta: 3, pregunta: '¿Qué es el denominador?', respuesta: 'Es el número de abajo.' },
    });
    const usuario = userEvent.setup();
    render(<TutorChat contentId={7} />);

    await usuario.type(await screen.findByLabelText(/su pregunta/i), '¿Qué es el denominador?');
    await usuario.click(screen.getByRole('button', { name: /enviar pregunta/i }));

    await waitFor(() => {
      expect(api.askTutor).toHaveBeenCalledWith({ question: '¿Qué es el denominador?', contentId: 7 });
    });
    expect(await screen.findByText(/es el número de abajo/i)).toBeInTheDocument();
  });

  test('tras enviar, el campo se vacía y recupera el foco', async () => {
    api.askTutor.mockResolvedValue({
      consulta: { id_consulta: 3, pregunta: 'Hola', respuesta: 'Hola.' },
    });
    const usuario = userEvent.setup();
    render(<TutorChat contentId={1} />);

    const campo = await screen.findByLabelText(/su pregunta/i);
    await usuario.type(campo, 'Una duda');
    await usuario.click(screen.getByRole('button', { name: /enviar pregunta/i }));

    // Sin devolver el foco, quien usa teclado tendría que recorrer toda la
    // conversación hacia atrás para hacer la siguiente pregunta.
    await waitFor(() => {
      expect(campo).toHaveValue('');
      expect(campo).toHaveFocus();
    });
  });

  test('si el asistente no está configurado, lo explica sin jerga técnica', async () => {
    api.askTutor.mockRejectedValue(
      Object.assign(new Error('El asistente educativo no esta configurado'), { status: 503 })
    );
    const usuario = userEvent.setup();
    render(<TutorChat contentId={1} />);

    await usuario.type(await screen.findByLabelText(/su pregunta/i), 'Una duda');
    await usuario.click(screen.getByRole('button', { name: /enviar pregunta/i }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/no está disponible.*consulte a su docente/i);
  });

  test('un fallo al cargar el historial no impide preguntar', async () => {
    api.consultations.mockRejectedValue(new Error('sin conexión'));
    render(<TutorChat contentId={1} />);

    // El historial es un extra; quedarse sin él no debe bloquear lo principal.
    expect(await screen.findByRole('button', { name: /enviar pregunta/i })).toBeEnabled();
  });
});
