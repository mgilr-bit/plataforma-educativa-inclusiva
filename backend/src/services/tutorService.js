// Cliente del asistente educativo, construido sobre la Claude API de Anthropic.
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/claude');

class TutorError extends Error {
  constructor(mensaje, { estado, causa } = {}) {
    super(mensaje);
    this.name = 'TutorError';
    this.estado = estado || 502;
    this.causa = causa;
  }
}

// Instrucciones del asistente. El registro importa tanto como el contenido:
// muchos estudiantes sordos usan lengua de senas como primera lengua y el
// espanol escrito como segunda, de modo que la redaccion debe ser directa.
const INSTRUCCIONES = `Eres un tutor educativo de una plataforma para estudiantes con discapacidad auditiva de San Juan Sacatepequez, Guatemala.

Como debes escribir:
- Usa oraciones cortas, de una sola idea cada una.
- Usa vocabulario sencillo y concreto. Evita palabras rebuscadas.
- Evita modismos, refranes, metaforas y dobles sentidos: se prestan a confusion cuando el espanol escrito es segunda lengua.
- Cuando uses un termino tecnico, defínelo de inmediato con palabras simples.
- Organiza las explicaciones en pasos numerados o listas cortas.
- Responde en espanol de Guatemala, con trato de "vos" o "usted" segun te hablen.
- Se breve: apunta a menos de 200 palabras, salvo que pidan un desarrollo mayor.

Como debes ensenar:
- Explica el porque, no solo el resultado. El objetivo es que el estudiante entienda.
- Si la pregunta trae un error de concepto, corrigelo con amabilidad y explica la confusion.
- Da un ejemplo concreto y cercano a la vida diaria siempre que puedas.
- Termina con una pregunta breve que invite a seguir pensando.

Limites que debes respetar:
- Si te dan el contenido de una clase, apoya tu respuesta en el. No inventes lo que la clase no dijo.
- Si la pregunta no se puede responder con ese contenido, dilo con claridad y responde con tu conocimiento general, avisando que no venia en la clase.
- No resuelvas evaluaciones ni tareas calificadas en lugar del estudiante: guialo para que llegue solo a la respuesta.
- Si te preguntan algo ajeno a lo educativo, redirige con amabilidad hacia el estudio.`;

let clienteMemorizado = null;

// El cliente se crea una sola vez, pero solo cuando hay clave configurada.
function obtenerCliente() {
  if (!config.apiKey) {
    throw new TutorError('El asistente educativo no esta configurado', { estado: 503 });
  }
  if (!clienteMemorizado) {
    const opciones = { apiKey: config.apiKey };
    if (config.baseUrl) {
      opciones.baseURL = config.baseUrl;
    }
    clienteMemorizado = new Anthropic(opciones);
  }
  return clienteMemorizado;
}

// Arma el bloque de sistema. Las instrucciones y la transcripcion van juntas y
// se marcan para cache: varias preguntas sobre la misma clase reutilizan el
// prefijo y solo se cobra el texto nuevo.
function construirSistema({ tituloContenido, transcripcion }) {
  if (!transcripcion) {
    return INSTRUCCIONES;
  }

  const texto = transcripcion.length > config.MAX_CARACTERES_CONTEXTO
    ? `${transcripcion.slice(0, config.MAX_CARACTERES_CONTEXTO)}\n[...contenido recortado por extension...]`
    : transcripcion;

  return `${INSTRUCCIONES}

Contenido de la clase "${tituloContenido}", transcrito del audio:
---
${texto}
---`;
}

// Envia la consulta al modelo y devuelve el texto de la respuesta.
async function responderConsulta({ pregunta, tituloContenido, transcripcion, historial = [] }) {
  const cliente = obtenerCliente();

  const mensajes = [];
  for (const intercambio of historial) {
    mensajes.push({ role: 'user', content: intercambio.pregunta });
    if (intercambio.respuesta) {
      mensajes.push({ role: 'assistant', content: intercambio.respuesta });
    }
  }
  mensajes.push({ role: 'user', content: pregunta });

  try {
    const respuesta = await cliente.beta.messages.create({
      model: config.modelo,
      max_tokens: config.MAX_TOKENS,
      // El prefijo estable (instrucciones + transcripcion) se cachea.
      cache_control: { type: 'ephemeral' },
      system: construirSistema({ tituloContenido, transcripcion }),
      thinking: { type: 'adaptive' },
      output_config: { effort: config.esfuerzo },
      // Si el modelo declina por politica, la peticion se reintenta sola en
      // otro modelo dentro de la misma llamada.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: mensajes,
    });

    // Puede declinar toda la cadena de modelos; hay que comprobarlo antes de
    // leer el contenido.
    if (respuesta.stop_reason === 'refusal') {
      throw new TutorError(
        'El asistente no puede responder esa consulta. Reformulela o consulte a su docente.',
        { estado: 422 }
      );
    }

    const texto = respuesta.content
      .filter((bloque) => bloque.type === 'text')
      .map((bloque) => bloque.text)
      .join('\n')
      .trim();

    if (!texto) {
      throw new TutorError('El asistente no devolvio una respuesta utilizable');
    }

    return {
      texto,
      modelo: respuesta.model,
      tokens: {
        entrada: respuesta.usage?.input_tokens ?? null,
        salida: respuesta.usage?.output_tokens ?? null,
        cacheLeido: respuesta.usage?.cache_read_input_tokens ?? null,
      },
    };
  } catch (error) {
    if (error instanceof TutorError) {
      throw error;
    }
    // Clases tipadas del SDK, de la mas especifica a la mas general.
    if (error instanceof Anthropic.AuthenticationError) {
      throw new TutorError('La clave del asistente educativo no es valida', { estado: 503, causa: error });
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new TutorError('El asistente esta saturado. Intente de nuevo en unos minutos.', {
        estado: 429,
        causa: error,
      });
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new TutorError('No se pudo contactar el asistente educativo', { estado: 502, causa: error });
    }
    if (error instanceof Anthropic.APIError) {
      throw new TutorError(`El asistente respondio con un error (${error.status})`, {
        estado: 502,
        causa: error,
      });
    }
    throw error;
  }
}

module.exports = { responderConsulta, TutorError, INSTRUCCIONES };
