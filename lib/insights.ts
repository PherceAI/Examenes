import {AREAS} from './areas';
import {examWindow, monthName, shiftMonth} from './exam';
import {monthRows, questionStats, topicStats, type Row} from './stats';
import type {Database} from './types';

// Frases en lenguaje simple que explican a Gerencia qué está pasando en el mes elegido.

export type InsightTone = 'ok' | 'bad' | 'wip' | 'info';
export interface Insight {
  tone: InsightTone;
  text: string;
  /** Filtro de la tabla al que lleva la frase, si aplica. */
  estado?: string;
}

const lista = (names: string[], max = 3) => {
  const first = names.slice(0, max).map((n) => n.split(' ').slice(0, 2).join(' '));
  const rest = names.length - first.length;
  if (rest > 0) return `${first.join(', ')} y ${rest} más`;
  return first.length > 1 ? `${first.slice(0, -1).join(', ')} y ${first[first.length - 1]}` : first[0] || '';
};
const avg = (rows: Row[]) => {
  const s = rows.filter((r) => r.attempt?.enviado);
  return s.length ? Math.round(s.reduce((n, r) => n + (r.attempt?.nota || 0), 0) / s.length) : null;
};

export function monthInsights(db: Database, mes: string): Insight[] {
  const out: Insight[] = [];
  const w = examWindow(db.ajustes);
  const min = db.ajustes.notaMinima;
  const rows = monthRows(db, mes);
  const nombre = monthName(mes);
  const isCurrent = mes === w.mes;

  if (rows.length === 0) {
    out.push({tone: 'info', text: 'Todavía no hay empleados cargados. Agrégalos en "Empleados" con su cédula y un PIN para que puedan rendir.'});
    return out;
  }

  const sent = rows.filter((r) => r.attempt?.enviado);
  const started = rows.filter((r) => r.status === 'en-curso');
  const pending = rows.filter((r) => r.status === 'pendiente');
  const failed = rows.filter((r) => r.status === 'reprobado');

  // Participación
  if (isCurrent && !w.open && sent.length === 0 && started.length === 0) {
    out.push({tone: 'info', text: `El examen de ${nombre} todavía no abre (${w.label.toLowerCase()}). Cuando abra, aquí verás quién lo rinde y cómo le va.`});
  } else if (sent.length === rows.length) {
    out.push({tone: 'ok', text: rows.length === 1 ? `El único empleado ya envió el examen de ${nombre}.` : `Los ${rows.length} empleados ya enviaron el examen de ${nombre}.`});
  } else {
    const faltan = rows.length - sent.length;
    out.push({
      tone: sent.length === 0 ? 'wip' : 'info',
      text: `${sent.length} de ${rows.length} empleados ya enviaron el examen de ${nombre}. ${
        isCurrent && w.open ? `Faltan ${faltan}; ${w.label.toLowerCase()}.` : isCurrent ? `Faltan ${faltan}.` : `${faltan} no lo rindieron.`
      }`,
      estado: isCurrent ? 'pendiente' : 'sin-dato',
    });
  }
  if (started.length) {
    out.push({
      tone: 'wip',
      text: `${lista(started.map((r) => r.emp.nombre))} ${started.length === 1 ? 'lo empezó pero no lo terminó' : 'lo empezaron pero no lo terminaron'}. Su avance está guardado.`,
      estado: 'en-curso',
    });
  }
  if (isCurrent && w.open && pending.length && pending.length <= 5) {
    out.push({tone: 'info', text: `Sin empezar: ${lista(pending.map((r) => r.emp.nombre), 5)}.`, estado: 'pendiente'});
  }

  // Nota
  const p = avg(rows);
  if (p !== null) {
    const prev = avg(monthRows(db, shiftMonth(mes, -1)));
    const cmp = prev === null ? '' : p > prev ? ` Subió ${p - prev} puntos respecto a ${monthName(shiftMonth(mes, -1))}.` : p < prev ? ` Bajó ${prev - p} puntos respecto a ${monthName(shiftMonth(mes, -1))}.` : ` Igual que en ${monthName(shiftMonth(mes, -1))}.`;
    out.push({tone: p >= min ? 'ok' : 'bad', text: `El promedio del equipo es ${p} de 100, ${p >= min ? 'por encima' : 'por debajo'} de la nota mínima (${min}).${cmp}`});
  }
  if (failed.length) {
    out.push({tone: 'bad', text: `${failed.length === 1 ? 'Reprobó' : 'Reprobaron'} ${lista(failed.map((r) => r.emp.nombre))}. Conviene repasar con ${failed.length === 1 ? 'esa persona' : 'ellos'} los temas que fallaron.`, estado: 'reprobado'});
  }

  // Temas y preguntas
  const temas = topicStats(rows);
  if (temas.length) {
    const peor = temas[0];
    const mejor = temas[temas.length - 1];
    out.push({
      tone: peor.pct < min ? 'bad' : 'info',
      text: `El tema más difícil fue "${peor.nombre}": ${peor.pct}% de respuestas correctas.${peor.pct < min ? ' Es buena idea repasarlo en la próxima reunión.' : ''}`,
    });
    if (mejor.topicId !== peor.topicId) out.push({tone: 'ok', text: `El que mejor dominan es "${mejor.nombre}" (${mejor.pct}% correctas).`});
  }
  const q = questionStats(rows)[0];
  if (q && q.fallos > 1) out.push({tone: 'wip', text: `La pregunta que más fallan: "${q.texto}" (${q.fallos} de ${q.respondidas} se equivocaron).`});

  // Áreas
  const porArea = AREAS.map((a) => ({a, p: avg(rows.filter((r) => r.emp.area === a.id))})).filter((x) => x.p !== null) as {a: (typeof AREAS)[number]; p: number}[];
  if (porArea.length > 1) {
    porArea.sort((x, y) => y.p - x.p);
    out.push({tone: 'info', text: `Por área, a ${porArea[0].a.nombre} le fue mejor (${porArea[0].p}) y a ${porArea[porArea.length - 1].a.nombre} peor (${porArea[porArea.length - 1].p}).`});
  }

  const contra = rows.filter((r) => r.attempt && Object.keys(r.attempt.contradicciones).length > 0);
  if (contra.length) out.push({tone: 'wip', text: `${contra.length} ${contra.length === 1 ? 'autoevaluación tiene' : 'autoevaluaciones tienen'} respuestas marcadas como contradichas por los registros.`});

  return out;
}
