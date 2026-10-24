// Pruebas del panel de seguimiento.
//
// Es donde el docente descubre a quién tiene que buscar. Un estudiante sordo
// puede no preguntar por pena, así que el avance es a veces la única señal de
// que algo no va bien: si el panel la muestra mal, nadie se entera.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tracking from '../src/pages/Tracking';
import { api } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: {
      courses: vi.fn(), tracking: vi.fn(), suggestion: vi.fn(),
      exportTracking: vi.fn(),
    },
  };
});

const CURSOS = [{ id_curso: 1, nombre: 'Matemática I', grado: 'Primero Básico' }];

const DATOS = {
  curso: { id_curso: 1, nombre: 'Matemática I' },
  materiales: 3,
  estudiantes: [
    { id_usuario: 6, nombre_completo: 'Pedro López', avance: 27, ultima_visita: '2026-10-10T12:00:00Z', consultas: 5 },
    { id_usuario: 7, nombre_completo: 'Sofía Ramírez', avance: 0, ultima_visita: null, consultas: 0 },
  ],
  temas: [
    { id_contenido: 1, titulo: 'Suma y resta de fracciones', consultas: 4 },
    { id_contenido: 2, titulo: 'Mínimo común múltiplo', consultas: 1 },
  ],
};

function montar() {
  api.courses.mockResolvedValue({ cursos: CURSOS });
  api.tracking.mockResolvedValue(DATOS);
  render(<Tracking />);
}

describe('Panel de seguimiento', () => {
  beforeEach(() => vi.clearAllMocks());

  test('el avance se lee como número, no solo como barra', async () => {
    montar();

    // Quien no distingue el relleno del fondo tiene que poder leerlo igual.
    expect(await screen.findByText('27%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('quien nunca entró aparece, y se dice que nunca entró', async () => {
    montar();

    // Es justo a quien hay que buscar: omitirlo lo volvería invisible.
    await screen.findByText('Sofía Ramírez');
    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });

  test('es una tabla de verdad, con encabezados asociados', async () => {
    montar();

    const tabla = await screen.findByRole('table');
    expect(tabla).toBeInTheDocument();
    // Con encabezados de fila y columna, el lector de pantalla puede decir
    // «Pedro López, Consultas, 5» en vez de leer números sueltos.
    expect(screen.getByRole('columnheader', { name: 'Avance' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Pedro López' })).toBeInTheDocument();
  });

  test('los temas con más consultas se leen con su número', async () => {
    montar();

    await screen.findByText('Suma y resta de fracciones');
    expect(screen.getByText('4 consultas')).toBeInTheDocument();
    // Singular y plural: «1 consultas» se nota y se lee mal.
    expect(screen.getByText('1 consulta')).toBeInTheDocument();
  });

  test('exportar pide el archivo con la sesión, no con un enlace', async () => {
    api.exportTracking.mockResolvedValue({
      blob: new Blob(['Estudiante;Avance'], { type: 'text/csv' }),
      nombre: 'seguimiento.csv',
    });
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole('button', { name: /exportar a hoja de cálculo/i }));

    // Con un enlace, el navegador navega y no lleva la cabecera de
    // autenticación: devolvía «Falta el token de autenticación». Y pasar el
    // token por la dirección lo dejaría en los registros del servidor y en el
    // historial, con datos de menores de por medio.
    expect(api.exportTracking).toHaveBeenCalledWith('1', { desde: '', hasta: '' });
  });

  test('si falla la exportación, se dice', async () => {
    api.exportTracking.mockRejectedValue(new Error('La API respondió 500'));
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole('button', { name: /exportar a hoja de cálculo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/respondió 500/i);
  });

  test('la sugerencia se pide a propósito, no al cargar', async () => {
    montar();

    await screen.findByText('Pedro López');
    // Cuesta saldo del asistente: generarla en cada carga del panel sería
    // gastar sin que nadie la haya pedido.
    expect(api.suggestion).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /pedir una sugerencia/i })).toBeInTheDocument();
  });

  test('al pedirla, se anuncia la espera y se muestra', async () => {
    api.suggestion.mockResolvedValue({ sugerencia: 'Refuerce el tema de fracciones.' });
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole('button', { name: /pedir una sugerencia/i }));

    expect(await screen.findByText('Refuerce el tema de fracciones.')).toBeInTheDocument();
  });

  test('si falla la sugerencia, se dice y el panel sigue en pie', async () => {
    api.suggestion.mockRejectedValue(new Error('El asistente esta saturado.'));
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole('button', { name: /pedir una sugerencia/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/saturado/i);
    expect(screen.getByText('Pedro López')).toBeInTheDocument();
  });

  test('el periodo elegido se usa al consultar', async () => {
    const usuario = userEvent.setup();
    montar();

    await screen.findByText('Pedro López');
    await usuario.type(screen.getByLabelText('Desde'), '2026-08-01');

    await waitFor(() => {
      expect(api.tracking).toHaveBeenLastCalledWith('1', { desde: '2026-08-01', hasta: '' });
    });
  });

  test('sin estudiantes no se ofrece pedir una sugerencia', async () => {
    api.courses.mockResolvedValue({ cursos: CURSOS });
    api.tracking.mockResolvedValue({ ...DATOS, estudiantes: [], temas: [] });
    render(<Tracking />);

    // No hay nada que sugerir, y pedirla gastaría saldo para nada.
    expect(await screen.findByText(/todavía no tiene estudiantes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pedir una sugerencia/i })).toBeDisabled();
  });
});
