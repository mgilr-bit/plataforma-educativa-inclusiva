// Sesion del usuario.
//
// Guarda el token y el perfil, y los restaura al recargar la pagina para que la
// sesion no se pierda. Ningun componente toca localStorage directamente.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, readToken, saveToken, clearToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Arranca en true porque, si hay token guardado, hay que validarlo antes de
  // decidir que mostrar. Sin esto, la aplicacion parpadearia hacia el login.
  const [loading, setLoading] = useState(Boolean(readToken()));

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

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    saveToken(data.token);
    setUser(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, authenticated: Boolean(user) }),
    [user, loading, login, logout]
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
