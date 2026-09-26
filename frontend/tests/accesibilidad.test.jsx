// Auditoria automatica de accesibilidad.
//
// axe-core es el motor que usan las extensiones de auditoria de los
// navegadores. Detecta una parte de los problemas, no todos: lo que depende de
// juicio humano, como si un texto alternativo describe bien una imagen, ninguna
// herramienta lo ve. Aun asi, lo que si detecta son fallos objetivos que de
// otro modo llegarian a produccion.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import { AuthProvider } from '../src/context/AuthContext';
import AccessibilityBar from '../src/components/AccessibilityBar';
import Login from '../src/pages/Login';
import StudentPanel from '../src/pages/StudentPanel';
import TeacherPanel from '../src/pages/TeacherPanel';
import SubtitlePlayer from '../src/components/SubtitlePlayer';
import TutorChat from '../src/components/TutorChat';
import UsersAdmin from '../src/pages/UsersAdmin';
import { api, saveToken } from '../src/api/client';

vi.mock('../src/api/client', async () => {
  const real = await vi.importActual('../src/api/client');
  return {
    ...real,
    api: {
      profile: vi.fn(), courses: vi.fn(), login: vi.fn(),
      consultations: vi.fn(), askTutor: vi.fn(),
      users: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deactivateUser: vi.fn(),
    },
  };
});

// Reglas que jsdom no puede evaluar: el contraste exige calcular estilos
// reales, cosa que jsdom no hace. Esos valores se verificaron aparte, con la
// formula de WCAG, al fijar los tokens.
const OPCIONES = {
  rules: { 'color-contrast': { enabled: false } },
};

async function auditar(contenedor) {
  const resultado = await axe.run(contenedor, OPCIONES);
  return resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    descripcion: v.help,
    elementos: v.nodes.map((n) => n.html),
  }));
}

const USUARIO = { id_usuario: 1, nombre_completo: 'Milton Gil', rol: 'administrador' };

function envolver(componente) {
  saveToken('token-de-prueba');
  api.profile.mockResolvedValue({ usuario: USUARIO });
  return render(
    <MemoryRouter>
      <PreferencesProvider>
        <AuthProvider>{componente}</AuthProvider>
      </PreferencesProvider>
    </MemoryRouter>
  );
}

describe('Auditoría de accesibilidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.courses.mockResolvedValue({ cursos: [] });
    api.consultations.mockResolvedValue({ consultas: [] });
    api.users.mockResolvedValue({
      usuarios: [{ id_usuario: 2, nombre_completo: 'Ana Pérez', correo: 'a@b.gt', rol: 'docente', estado: true }],
      paginacion: { total: 1, pagina: 1, limite: 20, paginas: 1 },
    });
    URL.createObjectURL = vi.fn(() => 'blob:prueba');
    URL.revokeObjectURL = vi.fn();
  });

  test('los controles de accesibilidad no tienen violaciones', async () => {
    const { container } = envolver(<AccessibilityBar />);
    expect(await auditar(container)).toEqual([]);
  });

  test('la pantalla de inicio de sesión no tiene violaciones', async () => {
    const { container } = envolver(<Login />);
    expect(await auditar(container)).toEqual([]);
  });

  test('el panel del estudiante no tiene violaciones', async () => {
    const { container } = envolver(<StudentPanel />);
    expect(await auditar(container)).toEqual([]);
  });

  test('el panel del docente no tiene violaciones', async () => {
    const { container } = envolver(<TeacherPanel />);
    expect(await auditar(container)).toEqual([]);
  });

  test('el reproductor con subtítulos no tiene violaciones', async () => {
    const { container } = envolver(
      <SubtitlePlayer
        content={{ id_contenido: 1, titulo: 'Clase', tipo: 'video', url_archivo: 'https://x.gt/a.mp4' }}
        subtitles={[
          { id_subtitulo: 1, segmento_texto: 'Hola', tiempo_inicio: '0.000', tiempo_fin: '1.000' },
        ]}
      />
    );
    expect(await auditar(container)).toEqual([]);
  });

  test('la gestión de usuarios no tiene violaciones', async () => {
    const { container } = envolver(<UsersAdmin />);
    // Se espera a que la tabla exista: auditarla vacía no probaría nada.
    await screen.findByRole('table');
    expect(await auditar(container)).toEqual([]);
  });

  test('el chat con el asistente no tiene violaciones', async () => {
    const { container } = envolver(<TutorChat contentId={1} />);
    expect(await auditar(container)).toEqual([]);
  });
});
