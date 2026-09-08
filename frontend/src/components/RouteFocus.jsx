// Traslada el foco al contenido principal al cambiar de pantalla.
//
// En una aplicacion de una sola pagina el navegador no recarga nada, asi que el
// foco se queda donde estaba: quien usa lector de pantalla no se entera de que
// cambio de pantalla, y quien navega con teclado sigue tabulando desde el
// enlace que acaba de pulsar. Llevar el foco al <main> hace que el lector
// empiece a leer por el encabezado de la pagina nueva.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteFocus({ targetRef }) {
  const location = useLocation();
  const primeraCarga = useRef(true);

  useEffect(() => {
    // En la primera carga no se toca el foco: el navegador ya lo situa al
    // principio, y moverlo saltaria el enlace de salto al contenido.
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    targetRef.current?.focus();
  }, [location.pathname, targetRef]);

  return null;
}
