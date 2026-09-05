// Estructura de la aplicacion y sus rutas.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PreferencesProvider } from './context/PreferencesContext';
import { AuthProvider } from './context/AuthContext';
import AccessibilityBar from './components/AccessibilityBar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import StudentPanel from './pages/StudentPanel';
import CourseDetail from './pages/CourseDetail';
import './styles/global.css';
import './App.css';

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Primer elemento enfocable de la pagina: permite saltarse la
              navegacion, que es repetitiva en todas las pantallas. */}
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>

          <AccessibilityBar />

          <main id="contenido" className="content" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/panel"
                element={(
                  <ProtectedRoute>
                    <StudentPanel />
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
              <Route path="*" element={<h1>Página no encontrada</h1>} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </PreferencesProvider>
  );
}
