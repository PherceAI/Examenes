// Datos de DEMOSTRACIÓN solo para el entorno local (data-local). Nunca correr en producción.
// Uso: npm run demo
import {hashPin} from '../lib/auth';
import {updateDb} from '../lib/db';
import {freezeQuestions, grade, shiftMonth, currentMonth} from '../lib/exam';
import type {AreaId, Attempt, Employee} from '../lib/types';

if (process.env.NODE_ENV === 'production' || (process.env.DATA_DIR || '').startsWith('/data')) {
  console.error('El script de demo no se corre en producción.');
  process.exit(1);
}

const PERSONAL: [string, string, AreaId, string][] = [
  ['María Fernanda Guamán', '0604123451', 'recepcion', 'Recepcionista'],
  ['Luis Alberto Cando', '0604123452', 'recepcion', 'Recepcionista'],
  ['Jorge Daquilema', '0604123453', 'recepcion', 'Botones'],
  ['Rosa Elena Yépez', '0604123454', 'alimentos', 'Despacho de alimentos'],
  ['Carlos Inca', '0604123455', 'alimentos', 'Cocina'],
  ['Diana Paguay', '0604123456', 'alimentos', 'Mesero'],
  ['Andrés Moyón', '0604123457', 'alimentos', 'Mesero'],
  ['Patricia Chafla', '0604123458', 'alimentos', 'Bar'],
  ['Gloria Tenemaza', '0604123459', 'pisos', 'Camarera de pisos'],
  ['Mónica Lema', '0604123460', 'pisos', 'Camarera de pisos'],
  ['Segundo Pilco', '0604123461', 'pisos', 'Limpieza de áreas'],
  ['Blanca Asqui', '0604123462', 'lavanderia', 'Lavandería'],
  ['Fabián Gualli', '0604123463', 'lavanderia', 'Lavandería'],
];

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

async function main() {
  await updateDb((db) => {
    db.empleados = db.empleados.filter((e) => !e.demo);
    db.intentos = db.intentos.filter((i) => db.empleados.some((e) => e.id === i.empleadoId));
    const cur = currentMonth();
    const start = shiftMonth(cur, -4);

    const emps: Employee[] = PERSONAL.map(([nombre, cedula, area, puesto], i) => ({
      id: `demo${i + 1}`,
      nombre,
      cedula,
      pinHash: hashPin('1234'),
      area,
      puesto,
      activo: true,
      creado: `${start}-01T12:00:00.000Z`,
      demo: true,
    }));
    db.empleados.push(...emps);

    const skill = emps.map(() => 0.6 + rand() * 0.38);
    for (let k = -4; k <= 0; k++) {
      const mes = shiftMonth(cur, k);
      emps.forEach((emp, i) => {
        if (k < 0 && rand() < 0.08) return; // alguno no rindió
        if (k === 0 && i % 3 === 2) return; // pendientes del mes actual
        const preguntas = freezeQuestions(db, emp);
        const respuestas: Record<string, number> = {};
        const sinTerminar = k === 0 && i % 5 === 1;
        preguntas.forEach((q, n) => {
          if (sinTerminar && n > preguntas.length / 2) return;
          respuestas[q.id] = rand() < skill[i] ? q.correcta : (q.correcta + 1) % q.opciones.length;
        });
        const autoevalPreguntas = db.autoeval.map(({id, texto}) => ({id, texto}));
        const autoeval: Record<string, boolean> = {};
        if (!sinTerminar) autoevalPreguntas.forEach((q, n) => (autoeval[q.id] = n === 1 ? rand() < 0.85 : rand() < 0.15));
        const mates = emps.filter((e) => e.area === emp.area && e.id !== emp.id);
        const fecha = `${mes}-27T15:${String(10 + i).padStart(2, '0')}:00.000Z`;
        const a: Attempt = {
          id: `demo-${mes}-${i}`,
          empleadoId: emp.id,
          mes,
          iniciado: fecha,
          actualizado: fecha,
          preguntas,
          autoevalPreguntas,
          respuestas,
          autoeval,
          votoAmable: sinTerminar || mates.length === 0 ? undefined : mates[Math.floor(rand() * mates.length)].id,
          contradicciones: {},
        };
        if (!sinTerminar) {
          const g = grade(a);
          Object.assign(a, {nota: g.nota, porTema: g.porTema, enviado: fecha});
        }
        db.intentos.push(a);
      });
    }

    // Una autoevaluación contradicha, como en el documento
    const rosa = db.intentos.find((x) => x.empleadoId === 'demo4' && x.mes === shiftMonth(cur, -1));
    if (rosa) rosa.contradicciones['a1'] = 'Dice que no, pero los días 12 y 18 despachó platos sin comanda.';

    db.premios = db.premios.filter((p) => !p.empleadoId.startsWith('demo'));
    for (let k = -4; k <= -1; k++) {
      const mes = shiftMonth(cur, k);
      db.premios.push(
        {mes, empleadoId: 'demo6', vinos: 18 + Math.round(rand() * 10), calificacionClientes: 4.6},
        {mes, empleadoId: 'demo7', vinos: 11 + Math.round(rand() * 10), calificacionClientes: 4.8},
        {mes, empleadoId: 'demo8', vinos: 25 + Math.round(rand() * 10), calificacionClientes: 4.3}
      );
    }
    db.ajustes.ventana = 'abierta';
  });
  console.log('Demo cargada: 13 empleados (PIN 1234), 5 meses de exámenes, ventana abierta.');
}

main();
