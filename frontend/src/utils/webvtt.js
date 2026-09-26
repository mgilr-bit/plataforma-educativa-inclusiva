// Generacion de subtitulos en formato WebVTT.
//
// Se construye un archivo WebVTT a partir de los segmentos y se entrega al
// reproductor como pista de subtitulos nativa. Es preferible a dibujarlos por
// cuenta propia: el navegador respeta los ajustes de subtitulos del sistema
// operativo, que el usuario ya configuro a su gusto (tamano, color, fondo).

// WebVTT exige HH:MM:SS.mmm. Los tiempos llegan de la API como texto, porque
// PostgreSQL devuelve NUMERIC en ese formato.
export function formatTimestamp(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) {
    return '00:00:00.000';
  }

  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = Math.floor(total % 60);
  const milesimas = Math.round((total - Math.floor(total)) * 1000);

  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(horas)}:${dos(minutos)}:${dos(segundos)}.${String(milesimas).padStart(3, '0')}`;
}

// Devuelve el contenido del archivo WebVTT, o null si no hay nada que mostrar.
export function buildVtt(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  const bloques = segments
    .filter((s) => s && s.segmento_texto)
    .map((s, indice) => {
      const inicio = formatTimestamp(s.tiempo_inicio);
      const fin = formatTimestamp(s.tiempo_fin);
      // El texto se limpia de saltos de linea: un salto dentro de un bloque
      // WebVTT lo parte en dos y descuadra el archivo.
      const texto = String(s.segmento_texto).replace(/\s*\n\s*/g, ' ').trim();
      return `${indice + 1}\n${inicio} --> ${fin}\n${texto}`;
    });

  if (bloques.length === 0) {
    return null;
  }

  return `WEBVTT\n\n${bloques.join('\n\n')}\n`;
}

// Crea una URL temporal con la pista, para pasarsela al elemento <track>.
export function createVttUrl(segments) {
  const contenido = buildVtt(segments);
  if (!contenido) {
    return null;
  }
  return URL.createObjectURL(new Blob([contenido], { type: 'text/vtt' }));
}
