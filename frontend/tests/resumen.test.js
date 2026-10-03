// Pruebas del analizador del resumen.
import { describe, test, expect } from 'vitest';
import { parsearResumen } from '../src/utils/resumen';

const RESUMEN = `## De que trata
La clase explica el ciclo del agua.

## Lo importante
- El agua siempre se mueve.
- El ciclo tiene cuatro etapas.

## Palabras nuevas
ciclo: algo que pasa una y otra vez
vapor: agua en forma de aire caliente`;

describe('Analizador del resumen', () => {
  test('reconoce los encabezados como títulos', () => {
    const bloques = parsearResumen(RESUMEN);
    const titulos = bloques.filter((b) => b.tipo === 'titulo').map((b) => b.texto);
    expect(titulos).toEqual(['De que trata', 'Lo importante', 'Palabras nuevas']);
  });

  test('junta los puntos seguidos en una sola lista', () => {
    const bloques = parsearResumen(RESUMEN);
    const listas = bloques.filter((b) => b.tipo === 'lista');
    // Dos bloques de un elemento saldrían como dos listas distintas, y el
    // lector de pantalla anunciaría "lista de 1" dos veces.
    expect(listas).toHaveLength(1);
    expect(listas[0].elementos).toEqual(['El agua siempre se mueve.', 'El ciclo tiene cuatro etapas.']);
  });

  test('separa las palabras de su significado', () => {
    const bloques = parsearResumen(RESUMEN);
    const glosario = bloques.find((b) => b.tipo === 'glosario');
    expect(glosario.elementos[0]).toEqual({ palabra: 'ciclo', significado: 'algo que pasa una y otra vez' });
    expect(glosario.elementos).toHaveLength(2);
  });

  test('fuera del glosario, una frase con dos puntos no es una definición', () => {
    const bloques = parsearResumen(`## Lo importante
El agua sube: el sol la calienta.`);
    // Tomarla por definición partiría la frase en dos y cambiaría lo que dice.
    expect(bloques.find((b) => b.tipo === 'glosario')).toBeUndefined();
    expect(bloques.find((b) => b.tipo === 'parrafo').texto).toBe('El agua sube: el sol la calienta.');
  });

  test('un resumen vacío no revienta', () => {
    expect(parsearResumen('')).toEqual([]);
    expect(parsearResumen(null)).toEqual([]);
  });

  test('si no hay palabras difíciles, la frase queda como párrafo', () => {
    const bloques = parsearResumen(`## Palabras nuevas
Esta clase no tiene palabras nuevas.`);
    expect(bloques.find((b) => b.tipo === 'parrafo').texto).toBe('Esta clase no tiene palabras nuevas.');
  });
});
