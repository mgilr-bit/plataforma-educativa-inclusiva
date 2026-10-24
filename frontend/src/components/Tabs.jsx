// Pestañas.
//
// Siguen el patron de ARIA para tablist, que no es decorativo: con lector de
// pantalla, un grupo de botones cualquiera no dice cuantas pestañas hay ni
// cual esta abierta, y con teclado el tabulador obligaria a recorrerlas todas
// para llegar al contenido.
//
// Por eso: una sola parada del tabulador para todo el grupo, las flechas
// mueven entre pestañas, e Inicio y Fin van a los extremos.
//
// Los paneles no se desmontan al cambiar de pestaña, solo se ocultan. Si se
// desmontaran, el chat del asistente perderia lo escrito y volveria a pedir
// las consultas cada vez.
import { useId, useRef, useState } from 'react';
import './Tabs.css';

export default function Tabs({ etiqueta, pestanas, inicial }) {
  const base = useId();
  const [activa, setActiva] = useState(inicial || pestanas[0]?.id);
  const refs = useRef({});

  const visibles = pestanas.filter(Boolean);
  const indiceActivo = Math.max(0, visibles.findIndex((p) => p.id === activa));

  function mover(indice) {
    const destino = visibles[(indice + visibles.length) % visibles.length];
    setActiva(destino.id);
    // El foco acompaña a la selección: si se quedara atrás, la flecha
    // siguiente partiría desde la pestaña equivocada.
    refs.current[destino.id]?.focus();
  }

  function alPulsarTecla(evento) {
    const teclas = {
      ArrowRight: () => mover(indiceActivo + 1),
      ArrowLeft: () => mover(indiceActivo - 1),
      Home: () => mover(0),
      End: () => mover(visibles.length - 1),
    };
    const accion = teclas[evento.key];
    if (accion) {
      evento.preventDefault();
      accion();
    }
  }

  return (
    <div className="pestanas">
      <div className="pestanas__lista" role="tablist" aria-label={etiqueta}>
        {visibles.map((pestana) => {
          const seleccionada = pestana.id === activa;
          return (
            <button
              key={pestana.id}
              type="button"
              role="tab"
              id={`${base}-${pestana.id}`}
              aria-selected={seleccionada}
              aria-controls={`${base}-panel-${pestana.id}`}
              // Solo la activa es parada del tabulador; a las demás se llega
              // con las flechas.
              tabIndex={seleccionada ? 0 : -1}
              ref={(nodo) => { refs.current[pestana.id] = nodo; }}
              className={`pestanas__boton${seleccionada ? ' pestanas__boton--activa' : ''}`}
              onClick={() => setActiva(pestana.id)}
              onKeyDown={alPulsarTecla}
            >
              {pestana.titulo}
            </button>
          );
        })}
      </div>

      {visibles.map((pestana) => (
        <div
          key={pestana.id}
          role="tabpanel"
          id={`${base}-panel-${pestana.id}`}
          aria-labelledby={`${base}-${pestana.id}`}
          // El panel es enfocable para que, tras elegir la pestaña, el
          // tabulador siga en su contenido y no salte fuera del grupo.
          tabIndex={0}
          hidden={pestana.id !== activa}
          className="pestanas__panel"
        >
          {pestana.contenido}
        </div>
      ))}
    </div>
  );
}
