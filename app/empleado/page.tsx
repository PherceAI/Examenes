import Link from 'next/link';
import {ArrowRight, ArrowUpRight, CalendarClock, Clock3, ListChecks} from 'lucide-react';
import {iniciarExamen} from '@/app/actions';
import {EmployeeHeader} from '@/components/employee-header';
import {AreaDot, Avatar, btn, MonthStrip, StatusPill} from '@/components/ui';
import {areaById} from '@/lib/areas';
import {requireEmployee} from '@/lib/auth';
import {readDb} from '@/lib/db';
import {attemptOf, examWindow, formatCedula, monthName, statusFor, topicsFor} from '@/lib/exam';
import {punchMonths} from '@/lib/months';

export const dynamic = 'force-dynamic';

export default async function EmpleadoHome() {
  const emp = await requireEmployee();
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const actual = attemptOf(db, emp.id, w.mes);
  const temas = topicsFor(db, emp);
  const totalPreguntas = db.preguntas.filter((q) => q.activa && temas.some((t) => t.id === q.topicId)).length;
  const historial = db.intentos.filter((i) => i.empleadoId === emp.id && i.enviado).sort((a, b) => b.mes.localeCompare(a.mes));
  const firstName = emp.nombre.split(' ')[0];
  const respondidas = actual ? Object.keys(actual.respuestas).length : 0;

  return (
    <>
      <EmployeeHeader />
      <main className="mx-auto max-w-xl px-5 pb-16 pt-8">
        <div className="rise">
          <h1 className="text-[38px] leading-[1.05] tracking-[-0.05em] text-ink">Hola, {firstName}.</h1>
          <div className="mt-4 flex items-center gap-3">
            <Avatar nombre={emp.nombre} area={emp.area} size={40} />
            <div className="min-w-0 text-[14px] leading-tight">
              <p className="truncate font-medium text-ink">
                {emp.puesto} <span className="text-ink-3">· {areaById(emp.area).nombre}</span>
              </p>
              <p className="num mt-1 font-mono text-[13px] text-ink-3">CI {formatCedula(emp.cedula)}</p>
            </div>
          </div>
        </div>

        {/* El examen del mes */}
        <section className="frame rise mt-8 p-6 [animation-delay:60ms]">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[24px] leading-tight tracking-[-0.04em] text-ink">Examen de {monthName(w.mes)}</h2>
            {actual?.enviado ? (
              <StatusPill status={statusFor(actual, db.ajustes, false)} nota={actual.nota} />
            ) : (
              <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium ${w.open ? 'bg-accent-soft text-accent-strong' : 'bg-subtle text-ink-3'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${w.open ? 'live-dot bg-accent' : 'bg-[#d4d4d4]'}`} aria-hidden />
                {w.open ? 'Abierto' : 'Cerrado'}
              </span>
            )}
          </div>

          {actual?.enviado ? (
            <>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
                Ya lo enviaste. Sacaste <span className="num font-mono font-medium text-ink">{actual.nota}/100</span>; la nota mínima es {db.ajustes.notaMinima}.
              </p>
              <Link href="/empleado/resultado" className={`${btn.secondary} mt-6 h-12 w-full text-[15px]`}>
                Ver mis respuestas
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </>
          ) : w.open ? (
            <>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{w.label}. {temas.length} temas del reglamento, una sola vez, y se guarda mientras respondes.</p>
              <dl className="mt-5 grid grid-cols-2 border-y border-line text-[14px]">
                <div className="flex items-center gap-2.5 border-r border-line py-3 pr-3">
                  <ListChecks className="h-4 w-4 text-ink-3" aria-hidden />
                  <dt className="sr-only">Preguntas</dt>
                  <dd className="text-ink">
                    <span className="num font-mono">{totalPreguntas}</span> preguntas
                  </dd>
                </div>
                <div className="flex items-center gap-2.5 py-3 pl-4">
                  <Clock3 className="h-4 w-4 text-ink-3" aria-hidden />
                  <dt className="sr-only">Duración</dt>
                  <dd className="text-ink">Unos 10 min</dd>
                </div>
              </dl>
              {actual ? (
                <Link href="/empleado/examen" className={`${btn.primary} mt-6 h-12 w-full text-[16px]`}>
                  Continuar · <span className="num font-mono text-[14px]">{respondidas}/{actual.preguntas.length}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <form action={iniciarExamen} className="mt-6">
                  <button className={`${btn.primary} h-12 w-full text-[16px]`}>
                    Empezar examen
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              )}
            </>
          ) : (
            <p className="mt-3 flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-3">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="text-ink">{w.label}.</span> Los exámenes se abren del {db.ajustes.diaDesde} al {db.ajustes.diaHasta} de cada mes.
              </span>
            </p>
          )}
        </section>

        <section className="rise mt-10 [animation-delay:120ms]">
          <h2 className="text-[15px] font-medium text-ink">Tus últimos 12 meses</h2>
          <div className="mt-3">
            <MonthStrip months={punchMonths(db, emp)} live={w.open && !actual?.enviado ? w.mes : undefined} />
          </div>
        </section>

        {historial.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[15px] font-medium text-ink">Historial</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {historial.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-3.5">
                  <span className="text-[15px] text-ink first-letter:uppercase">{monthName(h.mes, true)}</span>
                  <StatusPill status={statusFor(h, db.ajustes, false)} nota={h.nota} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 flex items-center gap-2 text-[13px] text-ink-3">
          <AreaDot area={emp.area} /> Hotel Zeus · Riobamba
        </p>
      </main>
    </>
  );
}
