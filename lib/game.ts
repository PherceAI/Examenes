import type {Attempt, Database} from './types';
import {shiftMonth} from './exam';

// Mecánica de juego del examen: puntos, rachas de aciertos, estrellas por tema y racha mensual.

export const PUNTOS_ACIERTO = 10;
export const PUNTOS_BONO_RACHA = 5; // por cada acierto desde el tercero seguido
export const RACHA_BONO = 3;

export interface GameStats {
  aciertos: number;
  respondidas: number;
  total: number;
  puntos: number;
  mejorRacha: number;
  rachaActual: number;
}

/** Recorre las preguntas en el orden del examen (es el orden en que se responden). */
export function gameStats(a: Pick<Attempt, 'preguntas' | 'respuestas'>): GameStats {
  let aciertos = 0;
  let respondidas = 0;
  let puntos = 0;
  let racha = 0;
  let mejor = 0;
  for (const q of a.preguntas) {
    const r = a.respuestas[q.id];
    if (r === undefined) continue;
    respondidas += 1;
    if (r === q.correcta) {
      aciertos += 1;
      racha += 1;
      mejor = Math.max(mejor, racha);
      puntos += pointsFor(racha);
    } else {
      racha = 0;
    }
  }
  return {aciertos, respondidas, total: a.preguntas.length, puntos, mejorRacha: mejor, rachaActual: racha};
}

export function pointsFor(racha: number): number {
  return PUNTOS_ACIERTO + (racha >= RACHA_BONO ? PUNTOS_BONO_RACHA : 0);
}

/** 0 a 3 estrellas según el porcentaje de aciertos de un tema. */
export function stars(aciertos: number, total: number): number {
  if (!total) return 0;
  const pct = (aciertos / total) * 100;
  return pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
}

/** Meses seguidos con examen enviado, contando hacia atrás desde `hasta`
 *  (si ese mes todavía no se envió, empieza a contar desde el anterior). */
export function monthlyStreak(db: Database, empleadoId: string, hasta: string): number {
  const sent = new Set(db.intentos.filter((i) => i.empleadoId === empleadoId && i.enviado).map((i) => i.mes));
  let mes = sent.has(hasta) ? hasta : shiftMonth(hasta, -1);
  let n = 0;
  while (sent.has(mes)) {
    n += 1;
    mes = shiftMonth(mes, -1);
  }
  return n;
}
