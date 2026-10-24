// Formas de nombrar un momento de la clase.
//
// Una cosa es lo que se ve y otra lo que se oye: "2:05" en pantalla es claro y
// corto, pero un lector de pantalla lo lee "dos cero cinco", que no dice nada.

export function enMinutos(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

// Para nombres accesibles: "el minuto 2 con 5 segundos".
export function enPalabras(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;

  if (minutos === 0) {
    return `el segundo ${resto}`;
  }
  const parteMinutos = minutos === 1 ? 'el minuto 1' : `el minuto ${minutos}`;
  return resto === 0 ? parteMinutos : `${parteMinutos} con ${resto} segundos`;
}
