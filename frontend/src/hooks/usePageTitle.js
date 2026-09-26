// Fija el titulo del documento de cada pantalla.
//
// El criterio 2.4.2 de WCAG exige que cada pagina tenga un titulo que describa
// su tema. En una aplicacion de una sola pagina el navegador no lo cambia solo,
// de modo que todas las pantallas comparten el mismo titulo: quien tiene varias
// pestanas abiertas no distingue cual es cual, y el lector de pantalla anuncia
// siempre lo mismo al cambiar de pestana.
import { useEffect } from 'react';

const SUFIJO = 'Plataforma Educativa Inclusiva';

export default function usePageTitle(titulo) {
  useEffect(() => {
    // Lo propio de la pantalla va primero: en una pestana estrecha solo se ven
    // los primeros caracteres, y ahi debe estar lo que distingue.
    document.title = titulo ? `${titulo} · ${SUFIJO}` : SUFIJO;
  }, [titulo]);
}
