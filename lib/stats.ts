import {attemptOf, examWindow, statusFor, type MonthStatus} from './exam';
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
