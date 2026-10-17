// Gestion de usuarios. Solo la ve el administrador.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { LoadingState, ErrorState, EmptyState } from '../components/EstadoCarga';
import NewUserForm from '../components/NewUserForm';
import AdminLayout from '../components/AdminLayout';
import './UsersAdmin.css';
import usePageTitle from '../hooks/usePageTitle';

const ROLES = [
  { id: 1, nombre: 'administrador' },
  { id: 2, nombre: 'docente' },
  { id: 3, nombre: 'estudiante' },
];

export default function UsersAdmin() {
  usePageTitle('Usuarios');
  const [state, setState] = useState({ loading: true });
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [aviso, setAviso] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [mostrandoAlta, setMostrandoAlta] = useState(false);
  const altaRef = useRef(null);

  const avisoRef = useRef(null);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    api.users({ role, active, search, page: pagina })
      .then((data) => setState({
        loading: false,
        users: data.usuarios,
        paginacion: data.paginacion,
      }))
      .catch((error) => setState({ loading: false, error: error.message }));
  }, [role, active, search, pagina]);

  useEffect(load, [load]);

  // Al cambiar un filtro se vuelve a la primera pagina: quedarse en la cuarta
  // de un listado que ahora tiene dos deja la pantalla vacia sin explicacion.
  useEffect(() => { setPagina(1); }, [role, active, search]);

  // Al abrir el formulario, el foco entra en el: si se quedara en el boton,
  // quien usa teclado tendria que recorrer la pantalla para encontrarlo.
  useEffect(() => {
    if (mostrandoAlta) altaRef.current?.focus();
  }, [mostrandoAlta]);

  async function cambiarEstado(usuario) {
    setAviso(null);
    try {
      if (usuario.estado) {
        await api.deactivateUser(usuario.id_usuario);
        setAviso(`Se desactivó la cuenta de ${usuario.nombre_completo}.`);
      } else {
        await api.updateUser(usuario.id_usuario, { active: true });
        setAviso(`Se reactivó la cuenta de ${usuario.nombre_completo}.`);
      }
      load();
    } catch (error) {
      setAviso(error.message);
      window.requestAnimationFrame(() => avisoRef.current?.focus());
    }
  }

  const paginacion = state.paginacion;

  return (
    <AdminLayout>
      <h1>Gestión de usuarios</h1>
      <p>Aquí da de alta a los docentes y estudiantes.</p>

      {/* role="status" y no "alert": informa del resultado de algo que el
          administrador acaba de hacer, no interrumpe. */}
      {aviso && (
        <p className="mensaje-aviso" role="status" tabIndex={-1} ref={avisoRef}>
          {aviso}
        </p>
      )}

      <div className="usuarios__barra">
        <div className="usuarios__buscar">
          <label className="form-field__label" htmlFor="filtro-buscar">Buscar</label>
          <input
            id="filtro-buscar"
            className="form-field__input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o correo"
          />
        </div>

        <div className="usuarios__filtro">
          <label className="form-field__label" htmlFor="filtro-rol">Rol</label>
          <select id="filtro-rol" className="form-field__input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Todos</option>
            {ROLES.map((r) => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
          </select>
        </div>

        <div className="usuarios__filtro">
          <label className="form-field__label" htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" className="form-field__input" value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Desactivados</option>
          </select>
        </div>

        <button
          type="button"
          className="usuarios__alta"
          onClick={() => setMostrandoAlta((v) => !v)}
          aria-expanded={mostrandoAlta}
        >
          {mostrandoAlta ? 'Cerrar el formulario' : '+ Nuevo usuario'}
        </button>
      </div>

      {/* El formulario se abre a propósito: ocupaba media pantalla siempre,
          por encima de la tabla que es lo que se viene a consultar. */}
      {mostrandoAlta && (
        <div ref={altaRef} tabIndex={-1} className="usuarios__formulario">
          <NewUserForm roles={ROLES} onCreated={(usuario) => {
            setAviso(`Se creó la cuenta de ${usuario.nombre_completo}.`);
            setMostrandoAlta(false);
            load();
          }} />
        </div>
      )}


      {state.loading && <LoadingState label="Cargando las cuentas…" />}
      {state.error && <ErrorState message={state.error} onRetry={load} />}

      {state.users && state.users.length === 0 && (
        <EmptyState
          title="Ninguna cuenta coincide"
          description="Pruebe a quitar los filtros o a buscar otro nombre."
        />
      )}

      {state.users && state.users.length > 0 && (
        <>
          {/* El total se anuncia: quien no ve la tabla necesita saber cuantos
              resultados dio el filtro que acaba de aplicar. */}
          <p className="sr-only" aria-live="polite">
            {paginacion.total === 1 ? '1 cuenta encontrada' : `${paginacion.total} cuentas encontradas`}
          </p>

          <div className="tabla-ancha" tabIndex={0} role="region" aria-label="Cuentas registradas">
          <table className="tabla">
            <caption className="sr-only">Cuentas registradas en la plataforma</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <th scope="row">
                    <span className="usuarios__nombre">
                      {/* Las iniciales son decorativas: el nombre esta al
                          lado y ya lo dice. */}
                      <span className="usuarios__inicial" aria-hidden="true">
                        {usuario.nombre_completo.trim().charAt(0).toUpperCase()}
                      </span>
                      {usuario.nombre_completo}
                    </span>
                  </th>
                  <td>{usuario.correo}</td>
                  <td className="usuarios__rol">{usuario.rol}</td>
                  <td>
                    {/* El estado lleva texto y borde propio, no solo color:
                        quien no distingue el verde del rojo lo lee igual. */}
                    <span className={`etiqueta-estado etiqueta-estado--${usuario.estado ? 'activo' : 'inactivo'}`}>
                      {usuario.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {/* El nombre completo va en aria-label y no en un sufijo
                        oculto: el calculo del nombre accesible recorta el texto
                        de cada nodo por separado, asi que "Desactivar" y " la
                        cuenta de..." acabarian pegados en una sola palabra.
                        Sin esto, quien recorre los botones oiria "Desactivar"
                        repetido sin saber a quien afecta. */}
                    <button
                      type="button"
                      onClick={() => cambiarEstado(usuario)}
                      aria-label={`${usuario.estado ? 'Desactivar' : 'Reactivar'} la cuenta de ${usuario.nombre_completo}`}
                    >
                      {usuario.estado ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="usuarios__pie">
            <p className="usuarios__cuenta">
              Mostrando {state.users.length} de {paginacion.total}
              {paginacion.total === 1 ? ' cuenta' : ' cuentas'}
            </p>

            {paginacion.paginas > 1 && (
              // nav con nombre: quien navega por puntos de referencia
              // encuentra la paginacion sin recorrer la tabla entera.
              <nav className="paginacion" aria-label="Páginas de resultados">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina <= 1}
                >
                  Anterior
                </button>
                <span className="paginacion__posicion">
                  Página {paginacion.pagina} de {paginacion.paginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(paginacion.paginas, p + 1))}
                  disabled={pagina >= paginacion.paginas}
                >
                  Siguiente
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
