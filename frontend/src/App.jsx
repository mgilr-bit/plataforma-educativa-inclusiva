// Estructura de la aplicacion y sus rutas.
import { useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PreferencesProvider } from './context/PreferencesContext';
import { AuthProvider } from './context/AuthContext';
import AccessibilityBar from './components/AccessibilityBar';
import ProtectedRoute from './components/ProtectedRoute';
import RouteFocus from './components/RouteFocus';
import Home from './pages/Home';
import Login from './pages/Login';
import RolePanel from './pages/RolePanel';
import CourseDetail from './pages/CourseDetail';
import ContentDetail from './pages/ContentDetail';
import UsersAdmin from './pages/UsersAdmin';
import './styles/global.css';
import './App.css';

export default function App() {
  const mainRef = useRef(null);

  return (
    <PreferencesProvider>
      <AuthProvider>
        <BrowserRouter>
          <RouteFocus targetRef={mainRef} />
          {/* Primer elemento enfocable de la pagina: permite saltarse la
              navegacion, que es repetitiva en todas las pantallas. */}
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>

          <AccessibilityBar />

          <main id="contenido" ref={mainRef} className="content" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/panel"
                element={(
                  <ProtectedRoute>
                    <RolePanel />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/cursos/:id"
                element={(
                  <ProtectedRoute>
                    <CourseDetail />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/contenidos/:id"
                element={(
                  <ProtectedRoute>
                    <ContentDetail />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/usuarios"
                element={(
                  <ProtectedRoute>
                    <UsersAdmin />
                  </ProtectedRoute>
                )}
              />
              <Route path="*" element={<h1>Página no encontrada</h1>} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </PreferencesProvider>
  );
}
