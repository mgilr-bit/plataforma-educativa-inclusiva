// Sesion del usuario.
//
// Guarda el token y el perfil, y los restaura al recargar la pagina para que la
// sesion no se pierda. Ningun componente toca localStorage directamente.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, readToken, saveToken, clearToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Arranca en true porque, si hay token guardado, hay que validarlo antes de
  // decidir que mostrar. Sin esto, la aplicacion parpadearia hacia el login.
  const [loading, setLoading] = useState(Boolean(readToken()));
  // Distingue quedarse sin sesion de no haberla tenido nunca: al primero hay
  // que explicarle por que se le expulso, al segundo no hay nada que
  // explicarle y avisarle solo confundiria.
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!readToken()) {
      return undefined;
    }

    let active = true;
    api.profile()
      .then((data) => { if (active) setUser(data.usuario); })
      .catch(() => {
        // El token no sirve: vencido, revocado o firmado con otra clave.
        if (active) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  // El cliente avisa cuando la API rechaza una peticion autenticada. Al
  // quedarse sin usuario, las rutas protegidas llevan solas al inicio de
  // sesion, marcando de donde venia para poder volver.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    saveToken(data.token);
    setUser(data.usuario);
    setSessionExpired(false);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    // Salir por decision propia no es una sesion vencida.
    setSessionExpired(false);
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, logout, authenticated: Boolean(user) }),
    [user, loading, sessionExpired, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
