import type {MonthResult} from '@/components/ui';
import {attemptOf, examWindow, last12, statusFor} from './exam';
import type {Database, Employee} from './types';

/** Las 12 perforaciones de un empleado, terminando en el mes actual. */
export function punchMonths(db: Database, emp: Employee, end?: string): MonthResult[] {
  const w = examWindow(db.ajustes);
  const until = end || w.mes;
  return last12(until).map((mes) => {
    const a = attemptOf(db, emp.id, mes);
    const isOpen = mes === w.mes && w.open;
    const created = emp.creado.slice(0, 7);
    const status = !a && mes < created ? 'sin-dato' : statusFor(a, db.ajustes, isOpen || (mes === w.mes && !a));
    return {mes, status, nota: a?.enviado ? a.nota : undefined};
  });
}
