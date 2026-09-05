// Pruebas del generador de subtitulos WebVTT.
//
// Es una funcion pura, asi que se puede verificar a fondo. Y conviene: un
// formato de tiempo mal escrito hace que el navegador descarte la pista entera
// sin decir nada, y el estudiante se queda sin subtitulos.
import { describe, test, expect } from 'vitest';
import { formatTimestamp, buildVtt } from '../src/utils/webvtt';

describe('formatTimestamp', () => {
  test('usa el formato HH:MM:SS.mmm que exige WebVTT', () => {
    expect(formatTimestamp(0)).toBe('00:00:00.000');
    expect(formatTimestamp(1.8)).toBe('00:00:01.800');
    expect(formatTimestamp(65.25)).toBe('00:01:05.250');
    expect(formatTimestamp(3725.5)).toBe('01:02:05.500');
  });

  test('acepta los tiempos como texto, que es como llegan de la API', () => {
    // PostgreSQL devuelve NUMERIC como cadena: "7.200", no 7.2.
    expect(formatTimestamp('7.200')).toBe('00:00:07.200');
    expect(formatTimestamp('12.500')).toBe('00:00:12.500');
  });

  test('no produce un formato inválido ante datos corruptos', () => {
    // Devolver "NaN:NaN:NaN" haría que el navegador descartara toda la pista.
    expect(formatTimestamp(null)).toBe('00:00:00.000');
    expect(formatTimestamp('abc')).toBe('00:00:00.000');
    expect(formatTimestamp(-5)).toBe('00:00:00.000');
  });
});

describe('buildVtt', () => {
  const SEGMENTOS = [
    { id_subtitulo: 1, segmento_texto: 'Buenos días a todos.', tiempo_inicio: '0.000', tiempo_fin: '1.800' },
    { id_subtitulo: 2, segmento_texto: 'Hoy veremos las fracciones', tiempo_inicio: '1.800', tiempo_fin: '7.200' },
  ];

  test('empieza por la cabecera WEBVTT, sin la cual el archivo no vale', () => {
    expect(buildVtt(SEGMENTOS).startsWith('WEBVTT\n\n')).toBe(true);
  });

  test('escribe un bloque por segmento con sus tiempos', () => {
    const vtt = buildVtt(SEGMENTOS);
    expect(vtt).toContain('1\n00:00:00.000 --> 00:00:01.800\nBuenos días a todos.');
    expect(vtt).toContain('2\n00:00:01.800 --> 00:00:07.200\nHoy veremos las fracciones');
  });

  test('sin segmentos devuelve null en vez de un archivo vacío', () => {
    expect(buildVtt([])).toBeNull();
    expect(buildVtt(null)).toBeNull();
  });

  test('aplana los saltos de línea, que partirían el bloque en dos', () => {
    const vtt = buildVtt([
      { segmento_texto: 'Primera línea\nsegunda línea', tiempo_inicio: 0, tiempo_fin: 2 },
    ]);
    expect(vtt).toContain('Primera línea segunda línea');
  });

  test('descarta los segmentos sin texto y renumera', () => {
    const vtt = buildVtt([
      { segmento_texto: '', tiempo_inicio: 0, tiempo_fin: 1 },
      { segmento_texto: 'Con texto', tiempo_inicio: 1, tiempo_fin: 2 },
    ]);
    expect(vtt).toContain('Con texto');
    expect(vtt).toContain('1\n00:00:01.000');
  });
});
