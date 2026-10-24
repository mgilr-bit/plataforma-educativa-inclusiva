// Registra cuanto ha avanzado el estudiante en un material.
//
// Sin esto el docente no tiene forma de saber quien entro y quien no, y el
// panel de seguimiento se queda en cero. Importa especialmente aqui: un
// estudiante sordo puede no preguntar por pena, asi que el avance es a veces
// la unica señal de que algo no va bien.
//
// Lo que se guarda es el punto mas lejano alcanzado, no el actual: rebobinar
// para releer un fragmento no puede hacer retroceder el avance.
import { useEffect, useRef } from 'react';
import { api } from '../api/client';

// Cada cuanto se manda, como mucho. Mandar en cada latido del video serian
// decenas de peticiones por minuto para un dato que cambia poco.
const MINIMO_ENTRE_ENVIOS_MS = 10000;
// Cuanto tiene que crecer para que valga la pena mandarlo.
const SALTO_MINIMO = 5;

export default function useProgreso({ contentId, activo, porcentaje }) {
  const enviado = useRef(0);
  const ultimoEnvio = useRef(0);
  const pendiente = useRef(0);

  // Se guarda el ultimo valor conocido para poder mandarlo al salir.
  pendiente.current = Math.max(pendiente.current, porcentaje || 0);

  useEffect(() => {
    if (!activo || !contentId) return;
    const valor = pendiente.current;
    const ahora = Date.now();

    const creciLoSuficiente = valor - enviado.current >= SALTO_MINIMO;
    const paso = ahora - ultimoEnvio.current >= MINIMO_ENTRE_ENVIOS_MS;
    // El primer envio marca la visita, aunque el avance sea minimo.
    const esElPrimero = enviado.current === 0 && valor > 0;

    if (!esElPrimero && !(creciLoSuficiente && paso)) return;

    enviado.current = valor;
    ultimoEnvio.current = ahora;
    api.saveProgress(contentId, valor).catch(() => {
      // Que no se registre el avance no debe estorbar al estudiante: su clase
      // sigue funcionando igual.
    });
  }, [contentId, activo, porcentaje]);

  // Al salir de la pantalla se manda lo ultimo, aunque no haya llegado al
  // salto minimo: si no, el tramo final de cada clase nunca se contaria.
  useEffect(() => () => {
    if (!activo || !contentId) return;
    if (pendiente.current > enviado.current) {
      api.saveProgress(contentId, pendiente.current).catch(() => {});
    }
  }, [contentId, activo]);
}
