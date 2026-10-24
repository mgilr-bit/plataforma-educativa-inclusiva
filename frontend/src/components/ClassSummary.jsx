// Resumen de la clase en lenguaje sencillo.
//
// La transcripcion literal es un docente hablando a 165 palabras por minuto,
// con frases largas y subordinadas. Para un estudiante sordo senante el
// espanol escrito es segunda lengua, y es comun que lea por debajo de su
// grado: darle el texto crudo traslada el problema en vez de resolverlo.
//
// Por eso esto va ARRIBA de la transcripcion. Es la puerta de entrada a la
// clase; el texto completo queda para quien quiera el detalle.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { parsearResumen } from '../utils/resumen';
import './ClassSummary.css';

const NIVELES = [
  { valor: 'basico', etiqueta: 'Fácil de leer' },
  { valor: 'medio', etiqueta: 'Normal' },
  { valor: 'avanzado', etiqueta: 'Con detalle' },
];

const ETIQUETA = Object.fromEntries(NIVELES.map((n) => [n.valor, n.etiqueta]));

export default function ClassSummary({ contentId, puedeGestionar, tieneTranscripcion }) {
  const [resumenes, setResumenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [elegido, setElegido] = useState('basico');
  const [nivelAGenerar, setNivelAGenerar] = useState('basico');
  const [generando, setGenerando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState('');

  function cargar() {
    setCargando(true);
    api.summaries(contentId)
      .then((datos) => {
        setResumenes(datos.resumenes);
        if (datos.resumenes.length > 0) {
          setElegido((previo) => (
            datos.resumenes.some((r) => r.nivel_simplificacion === previo)
              ? previo
              : datos.resumenes[0].nivel_simplificacion
          ));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, [contentId]);

  const actual = resumenes.find((r) => r.nivel_simplificacion === elegido) || resumenes[0];

  async function generar() {
    setError(null);
    setGenerando(true);
    try {
      await api.createSummary(contentId, nivelAGenerar);
      setElegido(nivelAGenerar);
      setAviso(`Se generó el resumen «${ETIQUETA[nivelAGenerar]}».`);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  async function guardar() {
    if (!borrador.trim()) {
      setError('El resumen no puede quedar vacío.');
      return;
    }
    setError(null);
    setGenerando(true);
    try {
      await api.updateSummary(actual.id_resumen, borrador.trim());
      setEditando(false);
      setAviso('Se guardaron los cambios del resumen.');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  async function borrar() {
    setError(null);
    setGenerando(true);
    try {
      await api.deleteSummary(actual.id_resumen);
      setAviso('Se borró el resumen. Puede generarlo de nuevo.');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  if (cargando) return null;

  // Sin resumen y sin poder generarlo, no hay nada que decirle al estudiante:
  // un cartel de "todavía no hay resumen" solo le quita sitio a la clase.
  if (resumenes.length === 0 && !puedeGestionar) return null;

  const disponibles = NIVELES.filter((n) => resumenes.some((r) => r.nivel_simplificacion === n.valor));
  const faltantes = NIVELES.filter((n) => !resumenes.some((r) => r.nivel_simplificacion === n.valor));

  return (
    <section className="resumen" aria-labelledby="titulo-resumen">
      <h2 id="titulo-resumen">Resumen de la clase</h2>

      {error && <p className="resumen__error" role="alert">{error}</p>}
      <p className="resumen__estado-vivo" aria-live="polite">{aviso}</p>

      {disponibles.length > 1 && (
        <div className="resumen__niveles" role="group" aria-label="Cómo quiere leer el resumen">
          {disponibles.map((nivel) => (
            <button
              key={nivel.valor}
              type="button"
              className={`resumen__nivel${elegido === nivel.valor ? ' resumen__nivel--activo' : ''}`}
              onClick={() => setElegido(nivel.valor)}
              aria-pressed={elegido === nivel.valor}
            >
              {nivel.etiqueta}
            </button>
          ))}
        </div>
      )}

      {actual && !editando && <Cuerpo texto={actual.texto_resumen} />}

      {actual && editando && (
        <div className="resumen__edicion">
          <label className="form-field__label" htmlFor="resumen-texto">
            Texto del resumen
          </label>
          <textarea
            id="resumen-texto"
            className="resumen__campo"
            rows={14}
            value={borrador}
            onChange={(evento) => setBorrador(evento.target.value)}
            disabled={generando}
          />
          <button type="button" className="boton-principal" onClick={guardar} disabled={generando}>
            {generando ? 'Guardando…' : 'Guardar el resumen'}
          </button>
          <button type="button" className="resumen__accion" onClick={() => setEditando(false)} disabled={generando}>
            Cancelar
          </button>
        </div>
      )}

      {puedeGestionar && (
        <div className="resumen__gestion">
          {!tieneTranscripcion ? (
            <p className="resumen__ayuda">
              El resumen se hace a partir de la transcripción. Genere primero la
              transcripción de esta clase.
            </p>
          ) : (
            <>
              {actual && !editando && (
                <>
                  <button
                    type="button"
                    className="resumen__accion"
                    onClick={() => { setBorrador(actual.texto_resumen); setEditando(true); }}
                    aria-label={`Corregir el resumen «${ETIQUETA[actual.nivel_simplificacion]}»`}
                  >
                    Corregir este resumen
                  </button>
                  {/* El resumen lo escribe una maquina y tambien se equivoca.
                      Vale lo mismo que con la transcripcion: si nadie puede
                      arreglarlo, el error se queda. */}
                  <button
                    type="button"
                    className="resumen__accion"
                    onClick={borrar}
                    disabled={generando}
                    aria-label={`Borrar el resumen «${ETIQUETA[actual.nivel_simplificacion]}»`}
                  >
                    Borrarlo
                  </button>
                </>
              )}

              {faltantes.length > 0 && !editando && (
                <div className="resumen__generar">
                  <label className="form-field__label" htmlFor="resumen-nivel">
                    Generar un resumen
                  </label>
                  <select
                    id="resumen-nivel"
                    className="form-field__input"
                    value={nivelAGenerar}
                    onChange={(evento) => setNivelAGenerar(evento.target.value)}
                    disabled={generando}
                  >
                    {faltantes.map((nivel) => (
                      <option key={nivel.valor} value={nivel.valor}>{nivel.etiqueta}</option>
                    ))}
                  </select>
                  <button type="button" className="boton-principal" onClick={generar} disabled={generando}>
                    {generando ? 'Generando…' : 'Generar'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// Los encabezados y las listas se pintan como tales y no como texto corrido:
// asi el lector de pantalla puede saltar de seccion en seccion, y el glosario
// se anuncia como lo que es.
function Cuerpo({ texto }) {
  return (
    <div className="resumen__cuerpo">
      {parsearResumen(texto).map((bloque, indice) => {
        const clave = `${bloque.tipo}-${indice}`;
        if (bloque.tipo === 'titulo') {
          return <h3 key={clave}>{bloque.texto}</h3>;
        }
        if (bloque.tipo === 'lista') {
          return (
            <ul key={clave}>
              {bloque.elementos.map((elemento) => <li key={elemento}>{elemento}</li>)}
            </ul>
          );
        }
        if (bloque.tipo === 'glosario') {
          return (
            <dl key={clave} className="resumen__glosario">
              {bloque.elementos.map(({ palabra, significado }) => (
                <div key={palabra} className="resumen__termino">
                  <dt>{palabra}</dt>
                  <dd>{significado}</dd>
                </div>
              ))}
            </dl>
          );
        }
        return <p key={clave}>{bloque.texto}</p>;
      })}
    </div>
  );
}
