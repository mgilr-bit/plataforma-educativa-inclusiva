// El video o audio de la clase.
//
// Los controles son los del navegador a proposito. Unos propios se ven mas
// a medida, pero hay que rehacer a mano el teclado, el foco y los nombres
// accesibles, y es la causa mas comun de reproductores inaccesibles. Los
// nativos ya traen todo eso, incluido el boton de subtitulos.
//
// Los subtitulos se entregan como pista WebVTT nativa para que el navegador
// los dibuje respetando los ajustes que el usuario ya configuro en su sistema.
import { urlDeArchivo } from '../api/client';
import './MediaPlayer.css';

export default function MediaPlayer({ content, reproductor }) {
  const { mediaRef, esAudio, tieneMedio, vttUrl, mediaError, alAvanzar, alFallar } = reproductor;
  const Medio = esAudio ? 'audio' : 'video';

  if (!tieneMedio) {
    return (
      <p className="medio__aviso">
        Este material no tiene archivo para reproducir. Puede leer su
        transcripción.
      </p>
    );
  }

  if (mediaError) {
    return (
      <p className="medio__aviso" role="status">
        No se pudo reproducir el archivo. Puede leer la transcripción completa.
      </p>
    );
  }

  return (
    <Medio
      ref={mediaRef}
      className={`medio medio--${esAudio ? 'audio' : 'video'}`}
      // La ruta guardada es relativa al servidor de la API, no a la pagina.
      src={urlDeArchivo(content.url_archivo)}
      controls
      onTimeUpdate={alAvanzar}
      onError={alFallar}
    >
      {vttUrl && <track kind="captions" srcLang="es" label="Español" src={vttUrl} default />}
    </Medio>
  );
}
