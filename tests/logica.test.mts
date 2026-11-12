// Pruebas de la lógica del examen: banco, ventana, preguntas por puesto, mezcla y calificación.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {after, describe, test} from 'node:test';

const dir = mkdtempSync(path.join(tmpdir(), 'eval-test-'));
process.env.DATA_DIR = dir;
after(() => rmSync(dir, {recursive: true, force: true}));

const {AUTOEVAL_INICIAL, MAX_PREGUNTAS_POR_TEMA, PREGUNTAS_INICIALES, TEMAS_INICIALES} = await import('../lib/banco');
const {readDb, updateDb} = await import('../lib/db');
const exam = await import('../lib/exam');
const {checkPin, hashPin} = await import('../lib/auth');
const game = await import('../lib/game');
const {monthInsights} = await import('../lib/insights');
type Employee = import('../lib/types').Employee;
type Attempt = import('../lib/types').Attempt;

const emp = (puesto: string, area: Employee['area'] = 'alimentos'): Employee => ({
  id: `e-${puesto}`,
  nombre: 'Prueba Uno',
  cedula: '0600000001',
  pinHash: '',
  area,
  puesto,
  activo: true,
  creado: '2026-01-01T00:00:00.000Z',
});

describe('Banco de preguntas v1', () => {
  test('tiene 35 preguntas en 6 temas y 6 de autoevaluación', () => {
    assert.equal(PREGUNTAS_INICIALES.length, 35);
    assert.equal(TEMAS_INICIALES.length, 6);
    assert.equal(AUTOEVAL_INICIAL.length, 6);
  });

  test('ningún tema pasa de 6 preguntas', () => {
    for (const t of TEMAS_INICIALES) {
      const n = PREGUNTAS_INICIALES.filter((q) => q.topicId === t.id).length;
      assert.ok(n <= MAX_PREGUNTAS_POR_TEMA, `${t.nombre} tiene ${n}`);
    }
  });

  test('cada pregunta tiene opciones válidas y la correcta existe', () => {
    for (const q of PREGUNTAS_INICIALES) {
      assert.ok(q.opciones.length >= 2, q.texto);
      assert.ok(q.correcta >= 0 && q.correcta < q.opciones.length, q.texto);
      if (q.tipo === 'sino') assert.deepEqual(q.opciones, ['Sí', 'No']);
      assert.ok(TEMAS_INICIALES.some((t) => t.id === q.topicId), q.texto);
    }
  });

  test('ids únicos', () => {
    assert.equal(new Set(PREGUNTAS_INICIALES.map((q) => q.id)).size, PREGUNTAS_INICIALES.length);
  });

  test('respuestas clave del reglamento', () => {
    const r = (fragment: string) => {
      const q = PREGUNTAS_INICIALES.find((x) => x.texto.includes(fragment));
      assert.ok(q, fragment);
      return q.opciones[q.correcta];
    };
    assert.equal(r('cambia de dirección'), 'En los 5 primeros días siguientes');
    assert.equal(r('multa máxima'), '10 % de la remuneración');
    assert.equal(r('minutos de atraso'), '30 minutos');
    assert.equal(r('prestar su clave'), 'No');
    assert.equal(r('embriaguez'), 'Falta grave (puede terminar el contrato)');
  });
});

describe('Preguntas según el puesto', () => {
  test('despacho de alimentos rinde 6 temas (35 preguntas), los demás 5 temas (30)', async () => {
    const db = await readDb();
    assert.equal(exam.topicsFor(db, emp('Despacho de alimentos')).length, 6);
    assert.equal(exam.freezeQuestions(db, emp('Despacho de alimentos')).length, 35);
    assert.equal(exam.topicsFor(db, emp('Mesero')).length, 5);
    assert.equal(exam.freezeQuestions(db, emp('Recepcionista', 'recepcion')).length, 30);
  });

  test('al mezclar opciones la respuesta correcta sigue siendo la misma', async () => {
    const db = await readDb();
    for (let i = 0; i < 25; i++) {
      for (const f of exam.freezeQuestions(db, emp('Despacho de alimentos'))) {
        const orig = db.preguntas.find((q) => q.id === f.id)!;
        assert.equal(f.opciones[f.correcta], orig.opciones[orig.correcta]);
        assert.deepEqual([...f.opciones].sort(), [...orig.opciones].sort());
        if (f.tipo === 'sino') assert.deepEqual(f.opciones, ['Sí', 'No']);
      }
    }
  });

  test('las preguntas quedan agrupadas por tema en orden', async () => {
    const db = await readDb();
    const qs = exam.freezeQuestions(db, emp('Despacho de alimentos'));
    const orden = [...new Set(qs.map((q) => q.topicId))];
    assert.deepEqual(orden, TEMAS_INICIALES.map((t) => t.id));
  });
});

describe('Calificación', () => {
  const base = async (): Promise<Attempt> => {
    const db = await readDb();
    const preguntas = exam.freezeQuestions(db, emp('Despacho de alimentos'));
    return {id: 'a', empleadoId: 'e', mes: '2026-11', iniciado: '', actualizado: '', preguntas, autoevalPreguntas: [], respuestas: {}, autoeval: {}, contradicciones: {}};
  };

  test('todo correcto = 100', async () => {
    const a = await base();
    for (const q of a.preguntas) a.respuestas[q.id] = q.correcta;
    const g = exam.grade(a);
    assert.equal(g.nota, 100);
    assert.equal(g.porTema.length, 6);
    assert.ok(g.porTema.every((t) => t.aciertos === t.total));
  });

  test('todo mal = 0', async () => {
    const a = await base();
    for (const q of a.preguntas) a.respuestas[q.id] = (q.correcta + 1) % q.opciones.length;
    assert.equal(exam.grade(a).nota, 0);
  });

  test('nota proporcional y redondeada: 13 de 30 = 43', async () => {
    const a = await base();
    const qs = a.preguntas.filter((q) => q.topicId !== 't-despacho');
    a.preguntas = qs;
    qs.forEach((q, i) => (a.respuestas[q.id] = i < 13 ? q.correcta : (q.correcta + 1) % q.opciones.length));
    assert.equal(exam.grade(a).nota, 43);
  });

  test('aciertos por tema suman bien', async () => {
    const a = await base();
    const primera = a.preguntas.filter((q) => q.topicId === 't-obligaciones');
    a.respuestas[primera[0].id] = primera[0].correcta;
    a.respuestas[primera[1].id] = primera[1].correcta;
    const t = exam.grade(a).porTema.find((x) => x.topicId === 't-obligaciones')!;
    assert.deepEqual([t.aciertos, t.total], [2, 6]);
  });

  test('estado aprobado / reprobado con la nota mínima', () => {
    const s = {notaMinima: 70, diaDesde: 26, diaHasta: 30, ventana: 'auto' as const};
    const a = {enviado: 'x', nota: 70} as Attempt;
    assert.equal(exam.statusFor(a, s, true), 'aprobado');
    assert.equal(exam.statusFor({...a, nota: 69}, s, true), 'reprobado');
    assert.equal(exam.statusFor({} as Attempt, s, true), 'en-curso');
    assert.equal(exam.statusFor(undefined, s, true), 'pendiente');
    assert.equal(exam.statusFor(undefined, s, false), 'sin-dato');
  });
});

describe('Juego: puntos, rachas y estrellas', () => {
  const base = async (): Promise<Attempt> => {
    const db = await readDb();
    const preguntas = exam.freezeQuestions(db, emp('Mesero'));
    return {id: 'a', empleadoId: 'e', mes: '2026-11', iniciado: '', actualizado: '', preguntas, autoevalPreguntas: [], respuestas: {}, autoeval: {}, contradicciones: {}};
  };
  const wrong = (q: {correcta: number; opciones: string[]}) => (q.correcta + 1) % q.opciones.length;

  test('todo correcto: 10 por acierto y bono desde el tercero seguido', async () => {
    const a = await base();
    for (const q of a.preguntas) a.respuestas[q.id] = q.correcta;
    const g = game.gameStats(a);
    assert.equal(g.aciertos, 30);
    assert.equal(g.mejorRacha, 30);
    assert.equal(g.puntos, 30 * 10 + 28 * 5);
  });

  test('un error corta la racha', async () => {
    const a = await base();
    a.preguntas.slice(0, 10).forEach((q, i) => (a.respuestas[q.id] = i === 4 ? wrong(q) : q.correcta));
    const g = game.gameStats(a);
    assert.equal(g.respondidas, 10);
    assert.equal(g.aciertos, 9);
    assert.equal(g.mejorRacha, 5); // 4 antes del error, 5 después
    assert.equal(g.rachaActual, 5);
    assert.equal(g.puntos, (10 + 10 + 15 + 15) + (10 + 10 + 15 + 15 + 15));
  });

  test('estrellas por tema', () => {
    assert.equal(game.stars(6, 6), 3);
    assert.equal(game.stars(5, 6), 2);
    assert.equal(game.stars(3, 6), 1);
    assert.equal(game.stars(2, 6), 0);
    assert.equal(game.stars(0, 0), 0);
  });

  test('racha mensual cuenta meses seguidos enviados', async () => {
    const db = await readDb();
    const mk = (mes: string, enviado = true) => ({id: mes, empleadoId: 'r', mes, iniciado: '', actualizado: '', enviado: enviado ? 'x' : undefined, preguntas: [], autoevalPreguntas: [], respuestas: {}, autoeval: {}, contradicciones: {}});
    const d = {...db, intentos: [mk('2026-08'), mk('2026-09'), mk('2026-10'), mk('2026-11', false)]};
    assert.equal(game.monthlyStreak(d, 'r', '2026-11'), 3); // noviembre aún sin enviar: cuenta desde octubre
    d.intentos[3] = mk('2026-11');
    assert.equal(game.monthlyStreak(d, 'r', '2026-11'), 4);
    d.intentos.splice(1, 1); // falta septiembre
    assert.equal(game.monthlyStreak(d, 'r', '2026-11'), 2);
  });

  test('el resumen explica el mes en frases', async () => {
    const db = await readDb();
    const vacio = monthInsights({...db, empleados: []}, '2026-11');
    assert.match(vacio[0].text, /no hay empleados/);
    const e1 = {...emp('Mesero'), id: 'x1', nombre: 'Ana Pérez'};
    const a = await base();
    a.empleadoId = 'x1';
    for (const q of a.preguntas) a.respuestas[q.id] = q.correcta;
    a.enviado = '2026-11-27T10:00:00.000Z';
    Object.assign(a, exam.grade(a));
    const out = monthInsights({...db, empleados: [e1], intentos: [a]}, '2026-11');
    assert.ok(out.some((i) => /único empleado ya envió/.test(i.text)), out.map((i) => i.text).join(' | '));
    assert.ok(out.some((i) => /promedio del equipo es 100/.test(i.text)));
  });
});

describe('Ventana del examen (hora de Ecuador)', () => {
  test('la medianoche UTC sigue siendo el día anterior en Ecuador', () => {
    assert.deepEqual(exam.nowEcuador(new Date('2026-11-26T03:00:00Z')), {y: 2026, m: 11, d: 25});
    assert.deepEqual(exam.nowEcuador(new Date('2026-11-26T05:00:00Z')), {y: 2026, m: 11, d: 26});
  });

  test('modo abierta / cerrada manda sobre la fecha', () => {
    assert.equal(exam.examWindow({notaMinima: 70, diaDesde: 26, diaHasta: 30, ventana: 'abierta'}).open, true);
    assert.equal(exam.examWindow({notaMinima: 70, diaDesde: 26, diaHasta: 30, ventana: 'cerrada'}).open, false);
  });

  test('modo automático solo abre del 26 al 30', () => {
    const s = {notaMinima: 70, diaDesde: 1, diaHasta: 31, ventana: 'auto' as const};
    assert.equal(exam.examWindow(s).open, true); // del 1 al 31 siempre está abierto
    const hoy = exam.nowEcuador().d;
    const s2 = {...s, diaDesde: 26, diaHasta: 30};
    assert.equal(exam.examWindow(s2).open, hoy >= 26 && hoy <= 30);
  });

  test('meses: desplazamiento y últimos 12', () => {
    assert.equal(exam.shiftMonth('2026-01', -1), '2025-12');
    assert.equal(exam.shiftMonth('2026-12', 1), '2027-01');
    const l = exam.last12('2026-11');
    assert.equal(l.length, 12);
    assert.equal(l[0], '2025-12');
    assert.equal(l[11], '2026-11');
  });
});

describe('PIN y base de datos', () => {
  test('PIN con hash: acepta el correcto y rechaza otros', () => {
    const h = hashPin('1234');
    assert.ok(!h.includes('1234'));
    assert.equal(checkPin('1234', h), true);
    assert.equal(checkPin('1235', h), false);
    assert.equal(checkPin('1234', 'basura'), false);
  });

  test('escrituras simultáneas no se pierden', async () => {
    await Promise.all(
      Array.from({length: 40}, (_, i) =>
        updateDb((db) => {
          db.premios.push({mes: '2026-11', empleadoId: `x${i}`, vinos: i});
        })
      )
    );
    const db = await readDb();
    assert.equal(db.premios.length, 40);
  });

  test('una base vacía arranca con el banco v1 y sin empleados', async () => {
    const db = await readDb();
    assert.equal(db.empleados.length, 0);
    assert.equal(db.preguntas.length, 35);
    assert.equal(db.ajustes.notaMinima, 70);
  });
});
