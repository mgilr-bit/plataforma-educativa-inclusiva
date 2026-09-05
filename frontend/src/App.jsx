// Estructura de la aplicacion y sus rutas.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PreferencesProvider } from './context/PreferencesContext';
import AccessibilityBar from './components/AccessibilityBar';
import Home from './pages/Home';
import './styles/global.css';
import './App.css';

export default function App() {
  return (
    <PreferencesProvider>
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
            <Route path="*" element={<h1>Página no encontrada</h1>} />
          </Routes>
        </main>
      </BrowserRouter>
    </PreferencesProvider>
  );
}
