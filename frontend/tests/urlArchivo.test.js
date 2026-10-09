// Pruebas de cómo se resuelve la dirección de un archivo subido.
//
// Lo que se guarda en la base es una ruta relativa al servidor de la API
// («/archivos/...»), no a la página. En desarrollo son dos orígenes distintos
// —la página en 5173, la API en 4000— y en producción son dos dominios
// distintos: Vercel y Railway. Usarla tal cual hace que el navegador pida el
// archivo a quien no lo tiene.
import { describe, test, expect } from 'vitest';
import { urlDeArchivo } from '../src/api/client';

describe('Dirección de un archivo subido', () => {
  test('una ruta guardada se resuelve contra el servidor de la API', () => {
    // Sin esto el navegador la pide al origen de la página, que responde con
    // el index.html de la aplicación: el reproductor recibe HTML en lugar de
    // video y avisa de que no se pudo reproducir.
    expect(urlDeArchivo('/archivos/abc.mp4')).toBe('http://localhost:4000/archivos/abc.mp4');
  });

  test('una dirección de otro sitio se deja como está', () => {
    // Hay material que vive fuera de la plataforma y ya trae su dirección
    // completa.
    const externa = 'https://archive.org/download/clase/clase.mp4';
    expect(urlDeArchivo(externa)).toBe(externa);
  });

  test('sin archivo no hay dirección que resolver', () => {
    expect(urlDeArchivo(null)).toBe(null);
    expect(urlDeArchivo('')).toBe(null);
  });
});
