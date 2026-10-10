// Zona para arrastrar el archivo de la clase.
//
// Arrastrar es un atajo, nunca la unica forma: quien no puede usar el raton
// con precision, o no puede usarlo, tiene que poder elegir el archivo igual.
// Por eso debajo vive un <input type="file"> de verdad —con su etiqueta, su
// foco y su teclado— y la zona de arrastre solo lo acompaña.
import { useRef, useState } from 'react';
import Icon from './Icon';
import './FileDrop.css';

export default function FileDrop({ id, archivo, onArchivo, aceptados, ayuda, desactivado }) {
  const [encima, setEncima] = useState(false);
  const entradaRef = useRef(null);

  function soltar(evento) {
    evento.preventDefault();
    setEncima(false);
    if (desactivado) return;
    const elegido = evento.dataTransfer.files?.[0];
    if (elegido) onArchivo(elegido);
  }

  return (
    <div
      className={`soltar${encima ? ' soltar--encima' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
      onDragLeave={() => setEncima(false)}
      onDrop={soltar}
    >
      <Icon nombre="subir" tamano={32} />

      <p className="soltar__titulo" aria-hidden="true">
        Arrastre aquí el archivo de la clase
      </p>

      {/* La etiqueta real del campo. Se ve como el enlace de "o elíjalo", y es
          lo que anuncia el lector de pantalla: la frase de arrastrar no le
          sirve a quien no arrastra. */}
      <label className="soltar__etiqueta" htmlFor={id}>
        Elija el archivo de la clase
      </label>

      <p className="soltar__ayuda" id={`${id}-ayuda`}>{ayuda}</p>

      <input
        id={id}
        className="soltar__entrada"
        type="file"
        accept={aceptados}
        disabled={desactivado}
        aria-describedby={`${id}-ayuda`}
        ref={entradaRef}
        onChange={(evento) => onArchivo(evento.target.files[0] || null)}
      />

      {archivo && (
        <p className="soltar__elegido">
          Archivo elegido: <strong>{archivo.name}</strong>
        </p>
      )}
    </div>
  );
}
