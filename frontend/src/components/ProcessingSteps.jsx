// Los pasos por los que pasa una clase recien subida.
//
// Se enseñan porque el proceso tarda minutos y encadena tres servicios: subir
// el archivo, transcribirlo con Whisper y resumirlo con Claude. Sin esto, el
// docente ve una pantalla quieta y no sabe si avanza, si se colgo o si ya
// termino, y acaba subiendo la clase otra vez.
//
// El estado tambien se anuncia: quien no mira la pantalla fija necesita que se
// le diga cuando cambia de paso.
import Icon from './Icon';
import './ProcessingSteps.css';

const ETIQUETAS = {
  pendiente: 'Pendiente',
  proceso: 'En proceso…',
  hecho: 'Completado',
  error: 'No se pudo',
  omitido: 'No aplica',
};

export default function ProcessingSteps({ pasos, estimacion }) {
  const enCurso = pasos.find((p) => p.estado === 'proceso');

  return (
    <section className="proceso" aria-labelledby="titulo-proceso">
      <h2 id="titulo-proceso">Procesamiento automático</h2>

      {/* "polite": el docente puede estar escribiendo el titulo del siguiente
          material mientras el anterior se procesa. */}
      <p className="proceso__estado-vivo" aria-live="polite">
        {enCurso ? `${enCurso.titulo}: en proceso.` : ''}
      </p>

      <ol className="proceso__lista">
        {pasos.map((paso) => (
          <li key={paso.id} className={`proceso__paso proceso__paso--${paso.estado}`}>
            <span className="proceso__marca" aria-hidden="true">
              {paso.estado === 'hecho' && <Icon nombre="correcto" tamano={18} />}
              {paso.estado === 'error' && <Icon nombre="alerta" tamano={18} />}
            </span>
            <span className="proceso__texto">
              <span className="proceso__titulo">{paso.titulo}</span>
              {/* El estado va en palabras, no solo en el color del circulo. */}
              <span className="proceso__detalle">
                {paso.detalle || ETIQUETAS[paso.estado]}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {estimacion && (
        <p className="proceso__estimacion">
          <strong>Cuánto tarda la transcripción:</strong> {estimacion}
        </p>
      )}
    </section>
  );
}
