// Genera clases de ejemplo en audio, para poder probar el recorrido completo
// sin tener que grabar nada.
//
// Usa la sintesis de voz de macOS con una voz en espanol de Mexico, que es la
// mas cercana al habla de Guatemala entre las disponibles. El resultado es un
// archivo de audio real: sirve para probar la subida, la reproduccion y la
// transcripcion con Whisper de punta a punta.
//
// Uso: node scripts/generar-clases.js [directorio]
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const VOZ = 'Paulina';           // es_MX
const VELOCIDAD = 165;           // palabras por minuto: ritmo de aula, sin prisa

// Los textos imitan una clase real: frases cortas, vocabulario del programa de
// basico y algun titubeo, para que la transcripcion tenga algo que resolver.
const CLASES = [
  {
    archivo: 'matematica-fracciones',
    titulo: 'Suma y resta de fracciones',
    texto: `Buenos días a todos. Hoy vamos a ver cómo se suman y se restan las fracciones.
      Primero, recordemos qué es una fracción. El número de abajo se llama denominador.
      Dice en cuántas partes iguales cortamos el entero.
      El número de arriba se llama numerador. Dice cuántas partes tomamos.
      Por ejemplo, tres cuartos. Cortamos en cuatro partes y tomamos tres.
      Ahora bien. Para sumar dos fracciones, necesitamos que los denominadores sean iguales.
      Si son distintos, buscamos el mínimo común múltiplo.
      Veamos un ejemplo. Un medio más un cuarto.
      El mínimo común múltiplo de dos y cuatro es cuatro.
      Entonces un medio se convierte en dos cuartos.
      Dos cuartos más un cuarto son tres cuartos.
      Fíjense bien. Solo sumamos los numeradores. El denominador se queda igual.
      Para la próxima clase, resuelvan los ejercicios de la página treinta y dos.`,
  },
  {
    archivo: 'ciencias-agua',
    titulo: 'El ciclo del agua',
    texto: `Buenas tardes. Hoy hablaremos del ciclo del agua.
      El agua está siempre en movimiento. Nunca se acaba, solo cambia de lugar y de forma.
      El ciclo tiene cuatro etapas. Vamos a verlas una por una.
      La primera es la evaporación. El sol calienta el agua de los ríos y del mar.
      Esa agua se convierte en vapor y sube al cielo.
      La segunda es la condensación. Allá arriba hace frío.
      El vapor se enfría y forma las nubes.
      La tercera es la precipitación. Cuando la nube tiene mucha agua, cae.
      Cae como lluvia. A veces, en lugares muy fríos, cae como nieve o granizo.
      La cuarta es la infiltración. El agua que cae se mete en la tierra.
      De ahí sale otra vez a los ríos, y el ciclo vuelve a empezar.
      Aquí en San Juan Sacatepéquez lo vemos cada invierno.
      Para mañana, dibujen el ciclo del agua en su cuaderno.`,
  },
  {
    archivo: 'lenguaje-verbos',
    titulo: 'Los tiempos verbales',
    texto: `Buenos días. Hoy estudiaremos los tiempos verbales.
      Un verbo dice qué se hace. Correr, comer, estudiar.
      Pero también dice cuándo se hace. Eso es el tiempo verbal.
      Hay tres tiempos principales. Pasado, presente y futuro.
      El presente es lo que pasa ahora. Yo estudio.
      El pasado es lo que ya pasó. Yo estudié.
      El futuro es lo que va a pasar. Yo estudiaré.
      Escuchen la diferencia. Estudio. Estudié. Estudiaré.
      Cambia el final de la palabra. Esa parte final se llama terminación.
      Practiquen en casa con el verbo caminar.
      Escriban una oración en cada tiempo.`,
  },
];

function generar(destino) {
  fs.mkdirSync(destino, { recursive: true });

  // Se comprueba la herramienta antes de empezar, para no fallar a la mitad.
  try {
    execFileSync('say', ['-v', '?'], { stdio: 'ignore' });
  } catch {
    console.error('Este script necesita el comando "say" de macOS.');
    console.error('En otro sistema, grabe los audios a mano o use otra herramienta de síntesis.');
    process.exit(1);
  }

  const generados = [];

  for (const clase of CLASES) {
    const texto = clase.texto.split('\n').map((l) => l.trim()).join(' ');
    const temporal = path.join(os.tmpdir(), `${clase.archivo}.aiff`);
    const salida = path.join(destino, `${clase.archivo}.m4a`);

    console.log(`Generando "${clase.titulo}"...`);
    execFileSync('say', ['-v', VOZ, '-r', String(VELOCIDAD), '-o', temporal, texto]);

    // Whisper no acepta AIFF. Se convierte a AAC, que ademas pesa mucho menos.
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', temporal, salida]);
    fs.unlinkSync(temporal);

    const tamano = (fs.statSync(salida).size / 1024).toFixed(0);
    generados.push({ ...clase, salida, tamano });
  }

  console.log('\nClases generadas:\n');
  for (const g of generados) {
    console.log(`  ${g.titulo}`);
    console.log(`    ${g.salida}  (${g.tamano} KB)`);
  }
  console.log('\nSúbalas desde la pantalla del curso, como docente.');
  console.log('Con OPENAI_API_KEY configurada, podrá generar su transcripción real.');
}

const destino = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'docs', 'clases-ejemplo');

generar(destino);
