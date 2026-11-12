import {attemptOf, examWindow, shiftMonth, statusFor, type MonthStatus} from './exam';
import type {Attempt, Database, Employee} from './types';

export interface Row {
  emp: Employee;
  attempt?: Attempt;
  status: MonthStatus;
}

export function monthRows(db: Database, mes: string): Row[] {
  const w = examWindow(db.ajustes);
  return db.empleados
    .filter((e) => e.activo || attemptOf(db, e.id, mes))
    .filter((e) => e.creado.slice(0, 7) <= mes)
    .map((emp) => {
      const attempt = attemptOf(db, emp.id, mes);
      return {emp, attempt, status: statusFor(attempt, db.ajustes, mes === w.mes)};
    })
    .sort((a, b) => a.emp.nombre.localeCompare(b.emp.nombre));
}

export interface TopicStat {
  topicId: string;
  nombre: string;
  aciertos: number;
  total: number;
  pct: number;
}

export function topicStats(rows: Row[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const r of rows) {
    if (!r.attempt?.enviado) continue;
    for (const t of r.attempt.porTema || []) {
      const s = map.get(t.topicId) || {topicId: t.topicId, nombre: t.nombre, aciertos: 0, total: 0, pct: 0};
      s.aciertos += t.aciertos;
      s.total += t.total;
      map.set(t.topicId, s);
    }
  }
  return [...map.values()]
    .map((s) => ({...s, pct: s.total ? Math.round((s.aciertos / s.total) * 100) : 0}))
    .sort((a, b) => a.pct - b.pct);
}

export interface QuestionStat {
  id: string;
  texto: string;
  topic: string;
  fallos: number;
  respondidas: number;
}

export function questionStats(rows: Row[]): QuestionStat[] {
  const map = new Map<string, QuestionStat>();
  for (const r of rows) {
    const a = r.attempt;
    if (!a?.enviado) continue;
    for (const q of a.preguntas) {
      const s = map.get(q.id) || {id: q.id, texto: q.texto, topic: q.topicNombre, fallos: 0, respondidas: 0};
      s.respondidas += 1;
      if (a.respuestas[q.id] !== q.correcta) s.fallos += 1;
      map.set(q.id, s);
    }
  }
  return [...map.values()].filter((s) => s.fallos > 0).sort((a, b) => b.fallos / b.respondidas - a.fallos / a.respondidas || b.fallos - a.fallos);
}

/** Meses con datos o el actual, del más reciente al más antiguo. */
export function availableMonths(db: Database): string[] {
  const set = new Set(db.intentos.map((i) => i.mes));
  set.add(examWindow(db.ajustes).mes);
  return [...set].sort().reverse();
}

export interface TrendPoint {
  mes: string;
  promedio: number | null;
  rindieron: number;
  total: number;
}

/** Promedio y participación de los últimos `n` meses, terminando en `end`. */
export function monthTrend(db: Database, end: string, n = 6): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const mes = shiftMonth(end, -i);
    const rows = monthRows(db, mes);
    const sent = rows.filter((r) => r.attempt?.enviado);
    out.push({
      mes,
      promedio: sent.length ? Math.round(sent.reduce((s, r) => s + (r.attempt?.nota || 0), 0) / sent.length) : null,
      rindieron: sent.length,
      total: rows.length,
    });
  }
  return out;
}

/** Notas enviadas agrupadas en tramos para el histograma. */
export const BUCKETS = [
  {desde: 0, hasta: 39, label: '0–39'},
  {desde: 40, hasta: 59, label: '40–59'},
  {desde: 60, hasta: 69, label: '60–69'},
  {desde: 70, hasta: 79, label: '70–79'},
  {desde: 80, hasta: 89, label: '80–89'},
  {desde: 90, hasta: 100, label: '90–100'},
];
export function gradeBuckets(rows: Row[]) {
  return BUCKETS.map((b) => ({
    ...b,
    nombres: rows.filter((r) => r.attempt?.enviado && (r.attempt.nota ?? -1) >= b.desde && (r.attempt.nota ?? -1) <= b.hasta).map((r) => r.emp.nombre),
  }));
}
