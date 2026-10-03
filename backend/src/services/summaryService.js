// Resumen de una clase en lenguaje sencillo.
//
// La transcripcion literal no es accesibilidad por si sola: es un docente
// hablando a 165 palabras por minuto, con frases largas y subordinadas. Para
// un estudiante sordo senante el espanol escrito es segunda lengua, y es comun
// que lea por debajo de su grado. Darle el texto crudo traslada el problema en
// vez de resolverlo.
//
// El asistente ya sabe explicar asi, pero solo si el estudiante pregunta, y
// muchos no van a preguntar. Esto se lo da hecho.
const config = require('../config/claude');
const { obtenerCliente: crearCliente, traducirError } = require('./claudeClient');

class SummaryError extends Error {
  constructor(mensaje, { estado, causa } = {}) {
    super(mensaje);
    this.name = 'SummaryError';
    this.estado = estado || 502;
    this.causa = causa;
  }
}

const NIVELES = ['basico', 'medio', 'avanzado'];

// Que cambia de un nivel a otro. No son etiquetas decorativas: el salto entre
// "basico" y "avanzado" es el que hay entre poder leer la clase y no poder.
const EXIGENCIA = {
  basico: `Nivel basico. El estudiante lee espanol con dificultad.
- Oraciones de ocho palabras o menos, una idea cada una.
- Solo palabras de uso diario. Si no hay mas remedio que usar una palabra dificil, explicala ahi mismo.
- Usa presente siempre que puedas.
- Maximo seis puntos en la lista de ideas.`,
  medio: `Nivel medio. El estudiante lee espanol con soltura razonable.
- Oraciones de hasta quince palabras.
- Vocabulario comun, con los terminos propios de la materia explicados.
- Maximo ocho puntos en la lista de ideas.`,
  avanzado: `Nivel avanzado. El estudiante lee bien y quiere el detalle.
- Oraciones de hasta veinticinco palabras.
- Puedes usar los terminos de la materia con normalidad, definiendolos la primera vez.
- Maximo diez puntos en la lista de ideas.`,
};

const INSTRUCCIONES = `Resumes clases para estudiantes con discapacidad auditiva de San Juan Sacatepequez, Guatemala.

Lo que recibes es la transcripcion automatica del audio de una clase. Puede traer errores de transcripcion y muletillas del habla.

Reglas que no puedes romper:
- No inventes nada. Si la clase no lo dijo, no va en el resumen.
- Evita modismos, refranes, metaforas y dobles sentidos: se prestan a confusion cuando el espanol escrito es segunda lengua.
- Nada de "como todos sabemos", "obviamente" ni formulas que den por supuesto lo que el estudiante quiza no sabe.
- Escribe en espanol de Guatemala.
- No saludes ni te despidas. No hables de ti ni del resumen.

Devuelve exactamente esta estructura, con estos encabezados y nada mas:

## De que trata
Una o dos oraciones.

## Lo importante
Una lista de puntos. Cada punto, una idea completa.

## Palabras nuevas
Las palabras de la clase que un estudiante podria no conocer, con su significado en palabras simples, una por linea con el formato "palabra: significado". Si la clase no trae ninguna palabra dificil, escribe "Esta clase no tiene palabras nuevas."`;

function esNivelValido(nivel) {
  return NIVELES.includes(nivel);
}

/**
 * Genera el resumen de una clase a partir de su transcripcion.
 */
async function generarResumen({ tituloContenido, transcripcion, nivel = 'basico' }) {
  if (!esNivelValido(nivel)) {
    throw new SummaryError(`El nivel debe ser uno de: ${NIVELES.join(', ')}`, { estado: 400 });
  }
  if (!transcripcion || !transcripcion.trim()) {
    throw new SummaryError(
      'Esta clase todavia no tiene transcripcion, y el resumen se hace a partir de ella.',
      { estado: 409 }
    );
  }

  const cliente = crearCliente((mensaje, opciones) => new SummaryError(mensaje, opciones));

  const texto = transcripcion.length > config.MAX_CARACTERES_CONTEXTO
    ? `${transcripcion.slice(0, config.MAX_CARACTERES_CONTEXTO)}\n[...contenido recortado por extension...]`
    : transcripcion;

  try {
    const respuesta = await cliente.beta.messages.create({
      model: config.modelo,
      max_tokens: config.MAX_TOKENS,
      system: `${INSTRUCCIONES}\n\n${EXIGENCIA[nivel]}`,
      thinking: { type: 'adaptive' },
      output_config: { effort: config.esfuerzo },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{
        role: 'user',
        content: `Clase: "${tituloContenido}"\n\nTranscripcion del audio:\n---\n${texto}\n---\n\nEscribe el resumen.`,
      }],
    });

    if (respuesta.stop_reason === 'refusal') {
      throw new SummaryError(
        'El asistente no pudo resumir esta clase. Revise la transcripcion.',
        { estado: 422 }
      );
    }

    const resumen = respuesta.content
      .filter((bloque) => bloque.type === 'text')
      .map((bloque) => bloque.text)
      .join('\n')
      .trim();

    if (!resumen) {
      throw new SummaryError('El asistente no devolvio un resumen utilizable');
    }

    return {
      texto: resumen,
      modelo: respuesta.model,
      tokens: {
        entrada: respuesta.usage?.input_tokens ?? null,
        salida: respuesta.usage?.output_tokens ?? null,
        cacheEscrito: respuesta.usage?.cache_creation_input_tokens ?? null,
        cacheLeido: respuesta.usage?.cache_read_input_tokens ?? null,
      },
    };
  } catch (error) {
    if (error instanceof SummaryError) {
      throw error;
    }
    throw traducirError(error, (mensaje, opciones) => new SummaryError(mensaje, opciones));
  }
}

module.exports = { generarResumen, SummaryError, NIVELES, esNivelValido, INSTRUCCIONES, EXIGENCIA };
