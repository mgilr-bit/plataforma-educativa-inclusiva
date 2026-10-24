// Guarda en el equipo un archivo que llego por la API.
//
// Va aparte porque el navegador no ofrece nada mas directo: hay que crear una
// direccion temporal en memoria, simular la pulsacion de un enlace y liberar
// la direccion. Si no se libera, el archivo se queda ocupando memoria hasta
// que se cierre la pestaña.
export function guardarArchivo(blob, nombre) {
  const direccion = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = direccion;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(direccion);
}
