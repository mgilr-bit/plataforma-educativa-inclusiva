// Estados de carga, error y vacio.
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
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

// Un listado vacio necesita explicar por que lo esta y que hacer: "no hay
// datos" deja al usuario sin saber si fallo algo o si aun no le asignaron nada.
export function EmptyState({ title, description }) {
  return (
    <div className="estado-vacio">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
