import Link from 'next/link';
import {CalendarClock, Check, Flame} from 'lucide-react';
import {iniciarExamen} from '@/app/actions';
import {EmployeeHeader} from '@/components/employee-header';
import {AreaDot, Avatar, MonthStrip, StatusPill} from '@/components/ui';
import {areaById} from '@/lib/areas';
import {requireEmployee} from '@/lib/auth';
import {readDb} from '@/lib/db';
import {attemptOf, examWindow, formatCedula, monthName, statusFor, topicsFor} from '@/lib/exam';
import {punchMonths} from '@/lib/months';
import {monthlyStreak} from '@/lib/game';

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
  const racha = monthlyStreak(db, emp.id, w.mes);

  return (
    <>
      <EmployeeHeader />
      <main className="mx-auto max-w-xl px-5 pb-16 pt-8">
        <div className="rise">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[36px] leading-[1.05] font-semibold tracking-[-0.045em] text-ink">Hola, {firstName}.</h1>
            <span
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[16px] font-semibold ${racha > 0 ? 'bg-accent-soft text-accent' : 'bg-subtle text-ink-3'}`}
              title="Meses seguidos completando el examen"
            >
              <Flame className={`h-5 w-5 ${racha > 0 ? 'fill-accent/25' : ''}`} aria-hidden />
              <span className="num">{racha}</span>
              <span className="sr-only">meses seguidos</span>
            </span>
          </div>
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

        {/* La lección del mes */}
        <section className="rise mt-8 [animation-delay:60ms]">
          <div className="tile overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-accent first-letter:uppercase">Examen de {monthName(w.mes)}</p>
                <h2 className="mt-1 text-[24px] leading-tight font-semibold tracking-[-0.035em] text-ink">
                  {actual?.enviado ? 'Lección completada' : actual ? 'Sigue donde quedaste' : w.open ? 'Tu lección del mes' : 'Todavía no abre'}
                </h2>
              </div>
              {actual?.enviado ? (
                <StatusPill status={statusFor(actual, db.ajustes, false)} nota={actual.nota} />
              ) : (
                <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium ${w.open ? 'bg-accent-soft text-accent-strong' : 'bg-subtle text-ink-3'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${w.open ? 'live-dot bg-accent' : 'bg-[#d4d4d4]'}`} aria-hidden />
                  {w.open ? 'Abierto' : 'Cerrado'}
                </span>
              )}
            </div>

            {/* Camino de temas */}
            <ol className="mt-5 flex items-center gap-1.5 overflow-hidden px-5" aria-label="Temas de la lección">
              {temas.map((t, i) => {
                const qs = actual ? actual.preguntas.filter((q) => q.topicId === t.id) : [];
                const hechas = qs.filter((q) => actual?.respuestas[q.id] !== undefined).length;
                const completo = actual && qs.length > 0 && hechas === qs.length;
                return (
                  <li key={t.id} className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-b-4 text-[13px] font-semibold ${
                        completo ? 'border-[#11803a] bg-[#16a34a] text-white' : hechas > 0 ? 'border-[#b52805] bg-accent text-white' : 'border-line bg-paper text-ink-3'
                      }`}
                      title={t.nombre}
                    >
                      {completo ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : i + 1}
                      <span className="sr-only">{t.nombre}</span>
                    </span>
                    {i < temas.length - 1 && <span className={`h-1 flex-1 rounded-full ${completo ? 'bg-[#16a34a]' : 'bg-line-2'}`} aria-hidden />}
                  </li>
                );
              })}
            </ol>

            <div className="px-5 pb-5 pt-4">
              {actual?.enviado ? (
                <>
                  <p className="text-[15px] leading-relaxed text-ink-2">
                    Sacaste <span className="num font-semibold text-ink">{actual.nota}/100</span>. La nota mínima es {db.ajustes.notaMinima}.
                  </p>
                  <Link href="/empleado/resultado" className="btn-game btn-game-ink mt-5 w-full">
                    Ver mi resultado
                  </Link>
                </>
              ) : w.open ? (
                <>
                  <p className="text-[15px] leading-relaxed text-ink-2">
                    {actual
                      ? `Llevas ${respondidas} de ${actual.preguntas.length} preguntas. Tu avance está guardado.`
                      : `${temas.length} temas, ${totalPreguntas} preguntas, unos 8 minutos. Sabrás al instante si acertaste.`}
                  </p>
                  {actual ? (
                    <Link href="/empleado/examen" className="btn-game btn-game-accent mt-5 w-full">
                      Continuar
                    </Link>
                  ) : (
                    <form action={iniciarExamen} className="mt-5">
                      <button className="btn-game btn-game-accent w-full">¡Empezar!</button>
                    </form>
                  )}
                  <p className="mt-3 text-center text-[13px] text-ink-3">{w.label}</p>
                </>
              ) : (
                <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-2">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">{w.label}.</span> Se abre del {db.ajustes.diaDesde} al {db.ajustes.diaHasta} de cada mes.
                  </span>
                </p>
              )}
            </div>
          </div>
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
