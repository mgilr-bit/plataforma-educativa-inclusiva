// Iconos del sistema.
//
// Se dibujan en linea en vez de instalar una libreria: son pocos, pesan menos
// que cualquier paquete y heredan el color del texto, de modo que funcionan
// igual en el tema normal y en el de alto contraste sin tocarlos.
//
// Todos son decorativos: acompanan a un texto que ya dice lo mismo, asi que
// llevan aria-hidden. Un icono sin texto necesitaria su propia etiqueta.

const TRAZOS = {
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16.5" x2="12" y2="16.5" />
    </>
  ),
  libro: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <line x1="8" y1="7" x2="15" y2="7" />
      <line x1="8" y1="11" x2="13" y2="11" />
    </>
  ),
  personas: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 6" />
      <path d="M17.5 14.5a5.5 5.5 0 0 1 3 5" />
    </>
  ),
  reproducir: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  conversacion: (
    <>
      <path d="M20 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="12.5" x2="13" y2="12.5" />
    </>
  ),
  vacio: (
    <>
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <line x1="3" y1="8" x2="21" y2="8" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </>
  ),
  salir: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M9 16l-4-4 4-4" />
      <line x1="5" y1="12" x2="15" y2="12" />
    </>
  ),
};

export default function Icon({ nombre, tamano = 20 }) {
  const trazo = TRAZOS[nombre];
  if (!trazo) return null;

  return (
    <svg
      className="icono"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {trazo}
    </svg>
  );
}
