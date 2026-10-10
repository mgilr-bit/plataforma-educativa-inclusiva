// Límites con los que opera la plataforma.
//
// Es de solo lectura a propósito. Cambiar un límite desde aquí exigiría
// guardarlo en algún sitio, y hoy viven en el código y en las variables de
// entorno, que es donde deben estar: el tamaño máximo de un archivo no se
// toca sin volver a desplegar.
//
// La pantalla existe igual porque el dato hace falta a la vista. Cuando
// alguien pregunta cuánto puede pesar una clase, la respuesta no debería
// estar enterrada en un archivo del servidor.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import AdminLayout from '../components/AdminLayout';
import { LoadingState, ErrorState } from '../components/EstadoCarga';
import usePageTitle from '../hooks/usePageTitle';
import './Settings.css';

function Dato({ etiqueta, valor, nota }) {
  return (
    <div className="ajuste">
      <dt>{etiqueta}</dt>
      <dd>
        {valor}
        {nota && <span className="ajuste__nota">{nota}</span>}
      </dd>
    </div>
  );
}

export default function Settings() {
  usePageTitle('Configuración');
  const [estado, setEstado] = useState({ cargando: true });

  function cargar() {
    setEstado({ cargando: true });
    api.settings()
      .then((d) => setEstado({ cargando: false, ajustes: d.ajustes }))
      .catch((e) => setEstado({ cargando: false, error: e.message }));
  }

  useEffect(cargar, []);

  const a = estado.ajustes;

  return (
    <AdminLayout>
      <h1>Configuración</h1>
      <p>
        Así está configurada la plataforma hoy. Estos valores se cambian al
        desplegar, no desde esta pantalla.
      </p>

      {estado.cargando && <LoadingState label="Cargando la configuración…" />}
      {estado.error && <ErrorState message={estado.error} onRetry={cargar} />}

      {a && (
        <div className="ajustes">
          <section aria-labelledby="t-archivos">
            <h2 id="t-archivos">Archivos de las clases</h2>
            <dl>
              <Dato etiqueta="Tamaño máximo" valor={`${a.archivos.tamanoMaximoMb} MB`} />
              <Dato etiqueta="Formatos admitidos" valor={a.archivos.formatos.join(', ')} />
            </dl>
          </section>

          <section aria-labelledby="t-transcripcion">
            <h2 id="t-transcripcion">Transcripción</h2>
            <dl>
              <Dato etiqueta="Modelo" valor={a.transcripcion.modelo} />
              <Dato
                etiqueta="Límite del servicio"
                valor={`${a.transcripcion.tamanoMaximoApiMb} MB`}
                nota="Por encima de eso, el servidor comprime el audio antes de enviarlo."
              />
              <Dato
                etiqueta="Clave configurada"
                valor={a.transcripcion.configurado ? 'Sí' : 'No'}
                nota={a.transcripcion.configurado ? null : 'Sin clave, no se pueden generar transcripciones.'}
              />
            </dl>
          </section>

          <section aria-labelledby="t-asistente">
            <h2 id="t-asistente">Asistente educativo</h2>
            <dl>
              <Dato etiqueta="Modelo" valor={a.asistente.modelo} />
              <Dato etiqueta="Nivel de esfuerzo" valor={a.asistente.esfuerzo} />
              <Dato
                etiqueta="Historial por consulta"
                valor={`${a.asistente.historialMaximo} intercambios`}
                nota="Cuántas preguntas anteriores recibe como contexto."
              />
              <Dato
                etiqueta="Clave configurada"
                valor={a.asistente.configurado ? 'Sí' : 'No'}
                nota={a.asistente.configurado ? null : 'Sin clave, el asistente no responde.'}
              />
            </dl>
          </section>

          <section aria-labelledby="t-sesion">
            <h2 id="t-sesion">Sesión y seguridad</h2>
            <dl>
              <Dato etiqueta="Duración de la sesión" valor={a.sesion.duracion} />
              <Dato
                etiqueta="Intentos de inicio de sesión"
                valor={`${a.sesion.intentosDeLogin} fallidos`}
                nota={`Por dirección IP, cada ${a.sesion.ventanaMinutos} minutos.`}
              />
            </dl>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
