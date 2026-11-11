import type {Attempt, Database, Employee, FrozenQuestion, Settings, TopicScore} from './types';

// Reglas del examen mensual: ventana del 26 al 30 (hora de Ecuador), un intento por mes,
// preguntas del tema general + las del puesto del empleado, calificación automática.

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Fecha actual en Ecuador (UTC-5, sin horario de verano). */
export function nowEcuador(now = new Date()): {y: number; m: number; d: number} {
  const t = new Date(now.getTime() - 5 * 3600 * 1000);
  return {y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate()};
}

export function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function currentMonth(): string {
  const {y, m} = nowEcuador();
  return monthKey(y, m);
}

export function monthName(key: string, withYear = false): string {
  const [y, m] = key.split('-').map(Number);
  const name = MESES[m - 1] || key;
  return withYear ? `${name} ${y}` : name;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return monthKey(Math.floor(idx / 12), (idx % 12) + 1);
}

/** Los últimos 12 meses terminando en `end` (incluido), del más antiguo al más reciente. */
export function last12(end: string): string[] {
  return Array.from({length: 12}, (_, i) => shiftMonth(end, i - 11));
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export interface WindowState {
  open: boolean;
  mes: string;
  desde: number;
  hasta: number;
  /** Texto corto: "Abierto hasta el 30 de noviembre" / "Abre el 26 de noviembre" */
  label: string;
}

export function examWindow(s: Settings): WindowState {
  const {y, m, d} = nowEcuador();
  const mes = monthKey(y, m);
  const hasta = Math.min(s.diaHasta, daysInMonth(y, m));
  const desde = Math.min(s.diaDesde, hasta);
  const auto = d >= desde && d <= hasta;
  const open = s.ventana === 'abierta' ? true : s.ventana === 'cerrada' ? false : auto;
  const nombre = monthName(mes);
  let label: string;
  if (open) label = s.ventana === 'abierta' && !auto ? `Abierto por Gerencia` : `Abierto hasta el ${hasta} de ${nombre}`;
  else if (s.ventana === 'cerrada') label = 'Cerrado por Gerencia';
  else if (d < desde) label = `Abre el ${desde} de ${nombre}`;
  else label = `Abre el ${s.diaDesde} de ${monthName(shiftMonth(mes, 1))}`;
  return {open, mes, desde, hasta, label};
}

export function topicsFor(db: Database, emp: Employee) {
  return db.temas
    .filter((t) => t.puestos.length === 0 || t.puestos.includes(emp.puesto))
    .sort((a, b) => a.orden - b.orden);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Congela las preguntas del intento. Se mantiene el orden por tema; dentro del tema se mezclan.
 *  En opción múltiple se mezclan las opciones; Sí/No se deja siempre en ese orden. */
export function freezeQuestions(db: Database, emp: Employee): FrozenQuestion[] {
  const out: FrozenQuestion[] = [];
  for (const t of topicsFor(db, emp)) {
    const qs = shuffle(db.preguntas.filter((q) => q.topicId === t.id && q.activa));
    for (const q of qs) {
      let opciones = q.opciones;
      let correcta = q.correcta;
      if (q.tipo === 'multiple') {
        const order = shuffle(q.opciones.map((_, i) => i));
        opciones = order.map((i) => q.opciones[i]);
        correcta = order.indexOf(q.correcta);
      }
      out.push({id: q.id, topicId: t.id, topicNombre: t.nombre, tipo: q.tipo, texto: q.texto, opciones, correcta});
    }
  }
  return out;
}

export function grade(a: Attempt): {nota: number; porTema: TopicScore[]} {
  const map = new Map<string, TopicScore>();
  for (const q of a.preguntas) {
    const s = map.get(q.topicId) || {topicId: q.topicId, nombre: q.topicNombre, aciertos: 0, total: 0};
    s.total += 1;
    if (a.respuestas[q.id] === q.correcta) s.aciertos += 1;
    map.set(q.topicId, s);
  }
  const porTema = [...map.values()];
  const total = porTema.reduce((n, s) => n + s.total, 0);
  const ok = porTema.reduce((n, s) => n + s.aciertos, 0);
  return {nota: total ? Math.round((ok / total) * 100) : 0, porTema};
}

export type MonthStatus = 'aprobado' | 'reprobado' | 'en-curso' | 'pendiente' | 'sin-dato';

export function statusFor(a: Attempt | undefined, s: Settings, isOpenMonth: boolean): MonthStatus {
  if (a?.enviado && typeof a.nota === 'number') return a.nota >= s.notaMinima ? 'aprobado' : 'reprobado';
  if (a) return 'en-curso';
  return isOpenMonth ? 'pendiente' : 'sin-dato';
}

export function attemptOf(db: Database, empleadoId: string, mes: string) {
  return db.intentos.find((i) => i.empleadoId === empleadoId && i.mes === mes);
}

export function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export function formatCedula(c: string): string {
  return c.length === 10 ? `${c.slice(0, 9)}-${c.slice(9)}` : c;
}
