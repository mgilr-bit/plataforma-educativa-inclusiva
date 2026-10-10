// Estado compartido entre el reproductor y la transcripcion.
//
// Vive en un hook porque las dos piezas estan separadas en la pantalla —el
// video a un lado, el texto al otro— y necesitan lo mismo: en que segundo va
// la reproduccion, para resaltar el fragmento que suena, y como saltar a un
// momento al pulsar una linea.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createVttUrl } from '../utils/webvtt';

// Los tiempos llegan como texto desde la API.
export function toSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMinutes(seconds) {
  const total = Math.floor(toSeconds(seconds));
  const minutos = Math.floor(total / 60);
  const restantes = total % 60;
  return `${minutos}:${String(restantes).padStart(2, '0')}`;
}

export default function useReproductor({ content, subtitles }) {
  const mediaRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaError, setMediaError] = useState(false);

  const esAudio = content.tipo === 'audio';
  const tieneMedio = Boolean(content.url_archivo) && (esAudio || content.tipo === 'video');

  // La URL de la pista se crea una vez y se libera al desmontar: cada llamada
  // a createObjectURL reserva memoria hasta que se revoca.
  const vttUrl = useMemo(() => createVttUrl(subtitles), [subtitles]);
  useEffect(() => () => {
    if (vttUrl) URL.revokeObjectURL(vttUrl);
  }, [vttUrl]);

  const indiceActual = subtitles.findIndex(
    (s) => currentTime >= toSeconds(s.tiempo_inicio) && currentTime < toSeconds(s.tiempo_fin)
  );

  function saltarA(segundos) {
    if (mediaRef.current) {
      mediaRef.current.currentTime = toSeconds(segundos);
      mediaRef.current.play?.().catch(() => {
        // El navegador puede rechazar la reproduccion automatica; no es un
        // fallo que deba interrumpir al usuario.
      });
    }
  }

  return {
    mediaRef,
    esAudio,
    tieneMedio,
    vttUrl,
    mediaError,
    indiceActual,
    saltarA,
    alAvanzar: (e) => setCurrentTime(e.target.currentTime),
    alFallar: () => setMediaError(true),
  };
}
