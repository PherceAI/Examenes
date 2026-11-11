import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft, Check, Heart, X} from 'lucide-react';
import {EmployeeForm} from '@/components/employee-form';
import {PageHeader, Panel} from '@/components/manager-shell';
import {ContradictionNote, ReopenAttempt, ToggleActive} from '@/components/profile-actions';
import {AreaDot, Avatar, MonthStrip, Notice, StatusPill} from '@/components/ui';
import {areaById} from '@/lib/areas';
import {readDb} from '@/lib/db';
import {examWindow, formatCedula, monthName, statusFor} from '@/lib/exam';
import {punchMonths} from '@/lib/months';
import type {FrozenQuestion} from '@/lib/types';

export default async function PerfilEmpleado({
  params,
  searchParams,
}: {
  params: Promise<{id: string}>;
  searchParams: Promise<{mes?: string; nuevo?: string}>;
}) {
  const {id} = await params;
  const sp = await searchParams;
  const db = await readDb();
  const emp = db.empleados.find((e) => e.id === id);
  if (!emp) notFound();
  const w = examWindow(db.ajustes);
  const min = db.ajustes.notaMinima;

  const intentos = db.intentos.filter((i) => i.empleadoId === id).sort((a, b) => b.mes.localeCompare(a.mes));
  const sel = intentos.find((i) => i.mes === sp.mes) || intentos[0];
  const enviados = intentos.filter((i) => i.enviado && typeof i.nota === 'number');
  const promedio = enviados.length ? Math.round(enviados.reduce((n, i) => n + (i.nota || 0), 0) / enviados.length) : null;
  const votos = db.intentos.filter((i) => i.enviado && i.votoAmable === id);
  const votosPorMes = new Map<string, number>();
  for (const v of votos) votosPorMes.set(v.mes, (votosPorMes.get(v.mes) || 0) + 1);

  const porTema = new Map<string, FrozenQuestion[]>();
  for (const q of sel?.preguntas || []) porTema.set(q.topicNombre, [...(porTema.get(q.topicNombre) || []), q]);

  return (
    <>
      <PageHeader
        title={emp.nombre}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Link href="/gerencia/empleados" className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Empleados
            </Link>
            <span className="text-ink-2">
              <AreaDot area={emp.area} /> <span className="ml-1">{emp.puesto} · {areaById(emp.area).nombre}</span>
            </span>
            <span className="num font-mono text-[13px]">CI {formatCedula(emp.cedula)}</span>
            {!emp.activo && <span className="rounded-md bg-subtle px-2 py-0.5 text-[13px] text-ink-2">Pausado</span>}
          </span>
        }
        actions={<ToggleActive id={emp.id} activo={emp.activo} />}
      />

      <div className="px-5 py-8 lg:px-8">
        {sp.nuevo && (
          <div className="mb-6">
            <Notice tone="ok">Empleado creado. Entrégale su cédula y el PIN para que ingrese desde su teléfono.</Notice>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Avatar nombre={emp.nombre} area={emp.area} size={56} />
          <dl className="grid flex-1 grid-cols-3 divide-x divide-line">
            <div className="px-4 first:pl-0">
              <dt className="text-[13px] text-ink-3">Promedio</dt>
              <dd className="num mt-0.5 text-[28px] leading-none tracking-[-0.04em] text-ink">{promedio ?? '—'}</dd>
            </div>
            <div className="px-4">
              <dt className="text-[13px] text-ink-3">Exámenes</dt>
              <dd className="num mt-0.5 text-[28px] leading-none tracking-[-0.04em] text-ink">{enviados.length}</dd>
            </div>
            <div className="px-4">
              <dt className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <Heart className="h-3.5 w-3.5 text-accent" aria-hidden /> Votos amable
              </dt>
              <dd className="num mt-0.5 text-[28px] leading-none tracking-[-0.04em] text-ink">{votos.length}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6">
          <MonthStrip months={punchMonths(db, emp)} live={w.open ? w.mes : undefined} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="space-y-8">
            <Panel title="Historial">
              {intentos.length === 0 ? (
                <p className="px-5 py-4 text-[14px] text-ink-3">Todavía no ha rendido ningún examen.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {intentos.map((i) => {
                    const on = sel?.id === i.id;
                    return (
                      <li key={i.id}>
                        <Link
                          href={`/gerencia/empleados/${emp.id}?mes=${i.mes}`}
                          aria-current={on ? 'true' : undefined}
                          className={`relative flex items-center justify-between gap-2 px-5 py-3 transition-colors ${on ? 'bg-subtle' : 'hover:bg-subtle'}`}
                        >
                          {on && <span className="absolute inset-y-0 left-0 w-[2px] bg-accent" aria-hidden />}
                          <span className="text-[14px] text-ink first-letter:uppercase">{monthName(i.mes, true)}</span>
                          <StatusPill status={statusFor(i, db.ajustes, i.mes === w.mes)} nota={i.enviado ? i.nota : undefined} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {votosPorMes.size > 0 && (
              <Panel title="Votado como el más amable">
                <ul className="divide-y divide-line text-[14px]">
                  {[...votosPorMes.entries()]
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([mes, n]) => (
                      <li key={mes} className="flex justify-between px-5 py-2.5">
                        <span className="text-ink-2 first-letter:uppercase">{monthName(mes, true)}</span>
                        <span className="num font-mono text-[13px] text-ink">
                          {n} {n === 1 ? 'voto' : 'votos'}
                        </span>
                      </li>
                    ))}
                </ul>
              </Panel>
            )}

            <details className="frame group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                Editar datos o cambiar PIN
                <span className="text-[18px] leading-none text-ink-3 transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <div className="border-t border-line px-5 py-5">
                <EmployeeForm initial={{id: emp.id, nombre: emp.nombre, cedula: emp.cedula, area: emp.area, puesto: emp.puesto}} />
              </div>
            </details>
          </div>

          <div className="min-w-0 space-y-8">
            {sel ? (
              <>
                <Panel
                  title={<span className="first-letter:uppercase">Respuestas de {monthName(sel.mes, true)}</span>}
                  aside={<ReopenAttempt key={sel.id} intentoId={sel.id} mesLabel={monthName(sel.mes)} />}
                >
                  {!sel.enviado && (
                    <p className="border-b border-line bg-wip-soft px-5 py-2.5 text-[13.5px] text-wip">
                      Sin enviar: lleva {Object.keys(sel.respuestas).length} de {sel.preguntas.length} preguntas respondidas.
                    </p>
                  )}
                  <div className="divide-y divide-line">
                    {[...porTema.entries()].map(([tema, qs]) => {
                      const ok = qs.filter((q) => sel.respuestas[q.id] === q.correcta).length;
                      const low = ok / qs.length < min / 100;
                      return (
                        <div key={tema} className="px-5 py-4">
                          <h3 className="flex items-baseline justify-between gap-3 text-[15px] text-ink">
                            {tema}
                            <span className={`num font-mono text-[13px] ${low ? 'text-bad' : 'text-ink-2'}`}>
                              {ok}/{qs.length}
                            </span>
                          </h3>
                          <ul className="mt-3 space-y-2.5">
                            {qs.map((q) => {
                              const r = sel.respuestas[q.id];
                              const right = r === q.correcta;
                              return (
                                <li key={q.id} className="flex gap-3 text-[14px] leading-snug">
                                  {r === undefined ? (
                                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-dashed border-ink-3" role="img" aria-label="Sin responder" />
                                  ) : right ? (
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-label="Correcta" />
                                  ) : (
                                    <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-label="Incorrecta" />
                                  )}
                                  <span>
                                    <span className={right ? 'text-ink-2' : 'text-ink'}>{q.texto}</span>
                                    {r !== undefined && !right && (
                                      <span className="mt-1 block text-[13px] text-ink-3">
                                        Respondió <span className="text-bad">{q.opciones[r]}</span> · correcta <span className="text-ok">{q.opciones[q.correcta]}</span>
                                      </span>
                                    )}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel title="Autoevaluación">
                  <p className="border-b border-line px-5 py-3 text-[13.5px] text-ink-3">Si una respuesta no coincide con los registros, márcala y deja la nota.</p>
                  <ul className="divide-y divide-line">
                    {sel.autoevalPreguntas.map((q) => {
                      const r = sel.autoeval[q.id];
                      const flagged = Boolean(sel.contradicciones[q.id]);
                      return (
                        <li key={q.id} className={`px-5 py-3.5 ${flagged ? 'bg-bad-soft/60' : ''}`}>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-[14px] text-ink">{q.texto}</span>
                            <span className="num shrink-0 rounded-md border border-line px-2 py-0.5 font-mono text-[12.5px] text-ink">{r === undefined ? '—' : r ? 'Sí' : 'No'}</span>
                          </div>
                          <div className="mt-2">
                            <ContradictionNote key={`${sel.id}-${q.id}`} intentoId={sel.id} preguntaId={q.id} initial={sel.contradicciones[q.id]} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              </>
            ) : (
              <div className="frame px-6 py-14 text-center">
                <p className="text-[20px] tracking-[-0.03em] text-ink">Sin exámenes todavía.</p>
                <p className="mt-1.5 text-[14px] text-ink-3">Aquí verás sus respuestas, por tema, cuando rinda el primero.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
