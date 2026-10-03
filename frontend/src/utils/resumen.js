// Convierte el resumen en bloques con estructura.
//
// El resumen llega como texto con encabezados y listas. Pintarlo tal cual, en
// un solo parrafo, le quitaria justo lo que lo hace util: un lector de
// pantalla no podria saltar de seccion en seccion, y el glosario se leeria
// como una frase corrida.

const ENCABEZADO = /^##\s+(.+)$/;
const PUNTO = /^[-*]\s+(.+)$/;
// "palabra: significado", con la palabra sin espacios de sobra ni dos puntos.
const TERMINO = /^([^:]{1,60}):\s*(.+)$/;

export function parsearResumen(texto) {
  const bloques = [];
  if (!texto) return bloques;

  let seccion = null;

  for (const linea of texto.split('\n')) {
    const limpia = linea.trim();
    if (!limpia) continue;

    const encabezado = ENCABEZADO.exec(limpia);
    if (encabezado) {
      seccion = encabezado[1].trim();
      bloques.push({ tipo: 'titulo', texto: seccion });
      continue;
    }

    const punto = PUNTO.exec(limpia);
    if (punto) {
      agregarA(bloques, 'lista', punto[1].trim());
      continue;
    }

    // El glosario se reconoce por la seccion y no por la forma de la linea:
    // "El agua sube: el sol la calienta" tambien tiene dos puntos y no es una
    // definicion.
    const termino = esGlosario(seccion) ? TERMINO.exec(limpia) : null;
    if (termino) {
      agregarA(bloques, 'glosario', { palabra: termino[1].trim(), significado: termino[2].trim() });
      continue;
    }

    bloques.push({ tipo: 'parrafo', texto: limpia });
  }

  return bloques;
}

function esGlosario(seccion) {
  return Boolean(seccion) && /palabras/i.test(seccion);
}

// Las lineas seguidas del mismo tipo se juntan en un solo bloque, para que
// salgan como una lista y no como varias de un elemento.
function agregarA(bloques, tipo, elemento) {
  const ultimo = bloques[bloques.length - 1];
  if (ultimo && ultimo.tipo === tipo) {
    ultimo.elementos.push(elemento);
    return;
  }
  bloques.push({ tipo, elementos: [elemento] });
}
