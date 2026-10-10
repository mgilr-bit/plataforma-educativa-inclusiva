// Sugerencia pedagogica a partir del seguimiento del curso.
//
// Los numeros del panel no dicen que hacer. Un docente con veinticinco
// estudiantes ve una tabla y tiene que deducir solo donde esta el problema.
// Esto lee los mismos datos y propone acciones concretas con lo que la
// plataforma ya sabe hacer: publicar un refuerzo, revisar una transcripcion,
// generar un resumen mas sencillo.
const config = require('../config/claude');
const { obtenerCliente: crearCliente, traducirError } = require('./claudeClient');

class SuggestionError extends Error {
  constructor(mensaje, { estado, causa } = {}) {
    super(mensaje);
    this.name = 'SuggestionError';
    this.estado = estado || 502;
    this.causa = causa;
  }
}

const INSTRUCCIONES = `Asesoras a docentes de una plataforma educativa para estudiantes con discapacidad auditiva en San Juan Sacatepequez, Guatemala.

Recibes datos reales de seguimiento de un curso: cuanto ha avanzado cada estudiante, cuando entro por ultima vez y cuantas preguntas le hizo al asistente sobre cada clase.

Como leer los datos:
- Muchas consultas sobre una misma clase indican que ese tema no quedo claro, no que el estudiante no estudie.
- Un avance bajo con consultas altas es un estudiante que lo intenta y se atasca.
- Un avance bajo sin consultas es un estudiante que quiza se desconecto; conviene buscarlo.
- Un estudiante sordo puede no preguntar por pena. La falta de preguntas no prueba que entendio.

Reglas que no puedes romper:
- No inventes datos. Habla solo de lo que te dan.
- Nombra a los estudiantes solo si la observacion ayuda al docente a actuar; nunca los califiques de flojos, lentos ni nada parecido.
- Propon acciones que esta plataforma permite hacer: publicar una clase de refuerzo, revisar la transcripcion de un material, generar un resumen mas sencillo, buscar a un estudiante.
- Escribe en espanol de Guatemala, en frases cortas.
- Maximo 120 palabras. Sin encabezados ni listas con vinetas: dos o tres frases seguidas.
- No saludes ni te despidas.`;

async function sugerir({ curso, estudiantes, temas, materiales }) {
  if (estudiantes.length === 0) {
    throw new SuggestionError(
      'Este curso todavia no tiene estudiantes inscritos.',
      { estado: 409 }
    );
  }

  const cliente = crearCliente((mensaje, opciones) => new SuggestionError(mensaje, opciones));

  const filas = estudiantes
    .map((e) => `- ${e.nombre_completo}: ${e.avance}% de avance, ${e.consultas} consultas`
      + `${e.ultima_visita ? '' : ', nunca ha entrado'}`)
    .join('\n');

  const porTema = temas.length
    ? temas.map((t) => `- "${t.titulo}": ${t.consultas} consultas`).join('\n')
    : '(todavia no hay consultas al asistente)';

  try {
    const respuesta = await cliente.beta.messages.create({
      model: config.modelo,
      max_tokens: config.MAX_TOKENS,
      system: INSTRUCCIONES,
      thinking: { type: 'adaptive' },
      output_config: { effort: config.esfuerzo },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{
        role: 'user',
        content: `Curso: "${curso}" (${materiales} materiales publicados).

Avance por estudiante:
${filas}

Consultas al asistente, por clase:
${porTema}

Escribe la sugerencia.`,
      }],
    });

    if (respuesta.stop_reason === 'refusal') {
      throw new SuggestionError('No se pudo preparar la sugerencia.', { estado: 422 });
    }

    const texto = respuesta.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!texto) {
      throw new SuggestionError('El asistente no devolvio una sugerencia utilizable');
    }

    return { texto, tokens: respuesta.usage?.output_tokens ?? null };
  } catch (error) {
    if (error instanceof SuggestionError) throw error;
    throw traducirError(error, (mensaje, opciones) => new SuggestionError(mensaje, opciones));
  }
}

module.exports = { sugerir, SuggestionError, INSTRUCCIONES };
