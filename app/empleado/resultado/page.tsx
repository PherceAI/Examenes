import Link from 'next/link';
import {redirect} from 'next/navigation';
import {ArrowLeft, Check, X} from 'lucide-react';
import {EmployeeHeader} from '@/components/employee-header';
import {btn} from '@/components/ui';
import {requireEmployee} from '@/lib/auth';
import {readDb} from '@/lib/db';
import {attemptOf, examWindow, monthName} from '@/lib/exam';

export const dynamic = 'force-dynamic';

export default async function ResultadoPage() {
  const emp = await requireEmployee();
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const current = attemptOf(db, emp.id, w.mes);
  const a = current?.enviado
    ? current
    : db.intentos.filter((i) => i.empleadoId === emp.id && i.enviado).sort((x, y) => y.mes.localeCompare(x.mes))[0];
  if (!a?.enviado || typeof a.nota !== 'number') redirect('/empleado');
  const min = db.ajustes.notaMinima;
  const aprobado = a.nota >= min;
  const errores = a.preguntas.filter((q) => a.respuestas[q.id] !== q.correcta);

  return (
    <>
      <EmployeeHeader />
      <main className="mx-auto max-w-xl px-5 pb-16 pt-6">
        <Link href="/empleado" className={`${btn.ghost} -ml-3 h-9 text-[14px]`}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Inicio
        </Link>

        <section className="mt-4">
          <p className="text-[15px] text-ink-3 first-letter:uppercase">Examen de {monthName(a.mes, true)}</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="score-in num text-[96px] leading-[0.85] font-normal tracking-[-0.06em] text-ink">{a.nota}</span>
            <span className="num mb-2 font-mono text-[15px] text-ink-3">/ 100</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium ${aprobado ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
              {aprobado ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
              {aprobado ? 'Aprobado' : 'Reprobado'}
            </span>
            <span className="text-[14px] text-ink-3">La nota mínima es {min}.</span>
          </div>
          {/* Barra con la marca de la nota mínima */}
          <div className="relative mt-6 h-2 rounded-full bg-line-2" aria-hidden>
            <div className={`h-full rounded-full ${aprobado ? 'bg-ok' : 'bg-bad'}`} style={{width: `${a.nota}%`}} />
            <span className="absolute -top-1.5 h-5 w-px bg-ink" style={{left: `${min}%`}} />
          </div>
        </section>

        <section className="frame mt-10">
          <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-medium text-ink">Por tema</h2>
          <ul className="divide-y divide-line">
            {(a.porTema || []).map((t) => {
              const pct = Math.round((t.aciertos / t.total) * 100);
              const low = pct < min;
              return (
                <li key={t.topicId} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="min-w-0 flex-1 text-[15px] text-ink">{t.nombre}</span>
                  <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-line-2 sm:block" aria-hidden>
                    <span className={`block h-full rounded-full ${low ? 'bg-bad' : 'bg-ok'}`} style={{width: `${pct}%`}} />
                  </span>
                  <span className={`num w-10 text-right font-mono text-[14px] ${low ? 'text-bad' : 'text-ink'}`}>
                    {t.aciertos}/{t.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {errores.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-[24px] tracking-[-0.04em] text-ink">Para repasar</h2>
            <p className="mt-1 text-[15px] text-ink-3">
              {errores.length} {errores.length === 1 ? 'pregunta' : 'preguntas'} con la respuesta correcta.
            </p>
            <ul className="mt-5 space-y-3">
              {errores.map((q) => (
                <li key={q.id} className="rounded-xl border border-line p-4 shadow-[var(--shadow-soft)]">
                  <p className="text-[13px] text-ink-3">{q.topicNombre}</p>
                  <p className="mt-1 text-[16px] leading-snug tracking-[-0.01em] text-ink">{q.texto}</p>
                  <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[14px]">
                    <p className="flex items-start gap-2 text-ink-3 line-through decoration-bad/50">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-bad no-underline" aria-hidden />
                      <span>
                        <span className="sr-only">Tu respuesta: </span>
                        {q.opciones[a.respuestas[q.id]] ?? 'Sin respuesta'}
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                      <span>
                        <span className="sr-only">Respuesta correcta: </span>
                        {q.opciones[q.correcta]}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-10 text-[15px] text-ink-3">Respondiste todo correctamente. ¡Excelente!</p>
        )}
      </main>
    </>
  );
}
