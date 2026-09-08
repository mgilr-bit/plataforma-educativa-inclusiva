// Gestion de usuarios. Solo la ve el administrador.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import Layout from '../components/Layout';
import { LoadingState, ErrorState, EmptyState } from '../components/EstadoCarga';
import NewUserForm from '../components/NewUserForm';
import './UsersAdmin.css';

const ROLES = [
  { id: 1, nombre: 'administrador' },
  { id: 2, nombre: 'docente' },
  { id: 3, nombre: 'estudiante' },
];

export default function UsersAdmin() {
  const [state, setState] = useState({ loading: true });
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [aviso, setAviso] = useState(null);

  const avisoRef = useRef(null);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    api.users({ role, active, search })
      .then((data) => setState({ loading: false, users: data.usuarios, total: data.paginacion.total }))
      .catch((error) => setState({ loading: false, error: error.message }));
  }, [role, active, search]);

  useEffect(load, [load]);

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

  return (
    <Layout>
      <h1>Usuarios</h1>
      <p>Aquí da de alta a los docentes y estudiantes del establecimiento.</p>

      {/* role="status" y no "alert": informa del resultado de algo que el
          administrador acaba de hacer, no interrumpe. */}
      {aviso && (
        <p className="mensaje-aviso" role="status" tabIndex={-1} ref={avisoRef}>
          {aviso}
        </p>
      )}

      <NewUserForm roles={ROLES} onCreated={(usuario) => {
        setAviso(`Se creó la cuenta de ${usuario.nombre_completo}.`);
        load();
      }} />

      <h2>Cuentas registradas</h2>

      <div className="filtros">
        <div className="filtros__campo">
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

        <div className="filtros__campo">
          <label className="form-field__label" htmlFor="filtro-rol">Filtrar por rol</label>
          <select id="filtro-rol" className="form-field__input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Todos</option>
            {ROLES.map((r) => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
          </select>
        </div>

        <div className="filtros__campo">
          <label className="form-field__label" htmlFor="filtro-estado">Filtrar por estado</label>
          <select id="filtro-estado" className="form-field__input" value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Desactivados</option>
          </select>
        </div>
      </div>

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
          <p aria-live="polite">
            {state.total === 1 ? '1 cuenta encontrada' : `${state.total} cuentas encontradas`}
          </p>

          <table className="tabla">
            <caption className="sr-only">Cuentas registradas en la plataforma</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <th scope="row">{usuario.nombre_completo}</th>
                  <td>{usuario.correo}</td>
                  <td>{usuario.rol}</td>
                  <td>{usuario.estado ? 'Activa' : 'Desactivada'}</td>
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
        </>
      )}
    </Layout>
  );
}
