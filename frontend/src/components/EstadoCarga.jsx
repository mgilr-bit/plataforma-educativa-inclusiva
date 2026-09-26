// Estados de carga, error y vacio.
import Icon from './Icon';
//
// Se centralizan para que todas las pantallas los anuncien igual. El detalle
// que importa es aria-live: sin el, un lector de pantalla no se entera de que
// la lista termino de cargar, y el usuario se queda esperando en silencio.
export function LoadingState({ label = 'Cargando…' }) {
  return <p aria-live="polite">{label}</p>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="estado-error">
      <Icon nombre="alerta" tamano={22} />
      <div>
        <p>{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  );
}

// Un listado vacio necesita explicar por que lo esta y que hacer: "no hay
// datos" deja al usuario sin saber si fallo algo o si aun no le asignaron nada.
export function EmptyState({ title, description }) {
  return (
    <div className="estado-vacio">
      <Icon nombre="vacio" tamano={40} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
