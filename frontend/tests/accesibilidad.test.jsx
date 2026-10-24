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
import MediaPlayer from '../src/components/MediaPlayer';
import TranscriptList from '../src/components/TranscriptList';
import Tabs from '../src/components/Tabs';
import useReproductor from '../src/hooks/useReproductor';
import TutorChat from '../src/components/TutorChat';
import GenerateTranscription from '../src/components/GenerateTranscription';
import TranscriptionReview from '../src/components/TranscriptionReview';
import ContentSettings from '../src/components/ContentSettings';
import ClassSummary from '../src/components/ClassSummary';
import Tracking from '../src/pages/Tracking';
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
      transcribe: vi.fn(),
      updateSubtitle: vi.fn(), updateTranscription: vi.fn(),
      updateContent: vi.fn(), deactivateContent: vi.fn(),
      summaries: vi.fn(), createSummary: vi.fn(), updateSummary: vi.fn(), deleteSummary: vi.fn(),
      saveProgress: vi.fn().mockResolvedValue({ estado: 'ok' }),
      tracking: vi.fn(), suggestion: vi.fn(),
      trackingExportUrl: vi.fn(() => '/exportar'),
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
    api.tracking.mockResolvedValue({
      curso: { id_curso: 1, nombre: 'Matemática I' },
      materiales: 2,
      estudiantes: [{ id_usuario: 6, nombre_completo: 'Pedro López', avance: 27, ultima_visita: '2026-10-10T12:00:00Z', consultas: 5 }],
      temas: [{ id_contenido: 1, titulo: 'Fracciones', consultas: 4 }],
    });
    api.summaries.mockResolvedValue({
      resumenes: [{
        id_resumen: 1,
        nivel_simplificacion: 'basico',
        texto_resumen: '## De que trata\nEl ciclo del agua.\n\n## Palabras nuevas\nciclo: algo que se repite',
      }],
    });
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
    const CONTENIDO = { id_contenido: 1, titulo: 'Clase', tipo: 'video', url_archivo: '/archivos/a.mp4' };
    const SUBS = [{ id_subtitulo: 1, segmento_texto: 'Hola', tiempo_inicio: '0.000', tiempo_fin: '1.000' }];

    function Clase() {
      const reproductor = useReproductor({ content: CONTENIDO, subtitles: SUBS });
      return (
        <>
          <MediaPlayer content={CONTENIDO} reproductor={reproductor} />
          <TranscriptList subtitles={SUBS} reproductor={reproductor} />
        </>
      );
    }

    const { container } = envolver(<Clase />);
    expect(await auditar(container)).toEqual([]);
  });

  test('las pestañas no tienen violaciones', async () => {
    const { container } = envolver(
      <Tabs
        etiqueta="Secciones del material"
        pestanas={[
          { id: 'uno', titulo: 'Resumen', contenido: <p>Resumen</p> },
          { id: 'dos', titulo: 'Transcripción', contenido: <p>Transcripción</p> },
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

  test('el botón de generar la transcripción no tiene violaciones', async () => {
    const { container } = envolver(
      <GenerateTranscription
        content={{
          id_contenido: 9, id_docente: 1, titulo: 'Clase',
          tipo: 'audio', url_archivo: '/archivos/a.m4a',
        }}
        onGenerated={() => {}}
      />
    );
    // Se espera a que exista: con el usuario aun sin cargar, el componente no
    // se pinta y auditar un contenedor vacio no probaria nada.
    await screen.findByRole('button', { name: /generar transcripción/i });
    expect(await auditar(container)).toEqual([]);
  });

  test('la revisión de la transcripción no tiene violaciones', async () => {
    const { container } = envolver(
      <TranscriptionReview
        transcription={{ id_transcripcion: 1, estado_revision: 'pendiente' }}
        subtitles={[
          { id_subtitulo: 1, segmento_texto: 'Hola', tiempo_inicio: '0.000', tiempo_fin: '1.000', editado_docente: false },
          { id_subtitulo: 2, segmento_texto: 'Adiós', tiempo_inicio: '65.000', tiempo_fin: '70.000', editado_docente: true },
        ]}
        onUpdated={() => {}}
      />
    );
    expect(await auditar(container)).toEqual([]);
  });

  test('los ajustes del material no tienen violaciones', async () => {
    const { container } = envolver(
      <ContentSettings
        content={{ id_contenido: 9, titulo: 'Clase', tipo: 'audio', url_archivo: '/archivos/a.m4a', estado: true }}
        tieneTranscripcion={false}
        onUpdated={() => {}}
      />
    );
    expect(await auditar(container)).toEqual([]);
  });

  test('el resumen de la clase no tiene violaciones', async () => {
    const { container } = envolver(
      <ClassSummary contentId={9} puedeGestionar tieneTranscripcion />
    );
    await screen.findByRole('heading', { name: 'De que trata' });
    expect(await auditar(container)).toEqual([]);
  });

  test('el panel de seguimiento no tiene violaciones', async () => {
    api.courses.mockResolvedValue({ cursos: [{ id_curso: 1, nombre: 'Matemática I', grado: 'Primero' }] });
    const { container } = envolver(<Tracking />);
    await screen.findByRole('table');
    expect(await auditar(container)).toEqual([]);
  });

  test('el chat con el asistente no tiene violaciones', async () => {
    const { container } = envolver(<TutorChat contentId={1} />);
    expect(await auditar(container)).toEqual([]);
  });
});
