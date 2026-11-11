'use client';

import {useEffect, useMemo, useRef, useState, useTransition} from 'react';
import Link from 'next/link';
import {ArrowLeft, ArrowRight, Check, CloudOff, LoaderCircle, X} from 'lucide-react';
import {enviarExamen, guardarRespuesta} from '@/app/actions';
import {initials} from '@/lib/exam';
import type {AreaId} from '@/lib/types';
import {btn} from './ui';

export interface RunnerStep {
  kind: 'pregunta' | 'autoeval';
  id: string;
  seccion: string;
  texto: string;
  opciones: string[];
}

interface Companero {
  id: string;
  nombre: string;
  puesto: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ExamRunner({
  mes,
  area,
  steps,
  companeros,
  initialAnswers,
  initialVote,
}: {
  mes: string;
  area: AreaId;
  steps: RunnerStep[];
  companeros: Companero[];
  initialAnswers: Record<string, number>;
  initialVote?: string | null;
}) {
  const hasVote = companeros.length > 0;
  const total = steps.length + (hasVote ? 1 : 0); // + pantalla de revisión aparte
  const [answers, setAnswers] = useState(initialAnswers);
  const [vote, setVote] = useState<string | null | undefined>(initialVote);
  const firstOpen = useMemo(() => {
    const i = steps.findIndex((s) => initialAnswers[`${s.kind}:${s.id}`] === undefined);
    if (i >= 0) return i;
    return hasVote && initialVote === undefined ? steps.length : total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(firstOpen);
  const [save, setSave] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (advanceTimer.current && clearTimeout(advanceTimer.current)), []);

  const answeredCount =
    steps.filter((s) => answers[`${s.kind}:${s.id}`] !== undefined).length + (hasVote && vote !== undefined ? 1 : 0);
  const step = index < steps.length ? steps[index] : null;
  const isVote = hasVote && index === steps.length;
  const isReview = index >= total;

  async function persist(kind: 'pregunta' | 'autoeval' | 'voto', id: string, value: number | boolean | string | null) {
    setSave('saving');
    try {
      const res = await guardarRespuesta(kind, id, value);
      if (res && 'error' in res && res.error) {
        setSave('error');
        setError(res.error);
      } else {
        setSave('saved');
        setError(null);
      }
    } catch {
      setSave('error');
      setError('Sin conexión. Tu respuesta se enviará cuando vuelvas a tocar una opción.');
    }
  }

  function choose(opt: number) {
    if (!step) return;
    const key = `${step.kind}:${step.id}`;
    setAnswers((a) => ({...a, [key]: opt}));
    void persist(step.kind, step.id, step.kind === 'autoeval' ? opt === 0 : opt);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, total)), 320);
  }

  function chooseVote(id: string | null) {
    setVote(id);
    void persist('voto', 'voto', id);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setIndex(total), 320);
  }

  function submit() {
    setError(null);
    startSending(async () => {
      const res = await enviarExamen();
      if (res?.error) setError(res.error);
    });
  }

  const sections: {nombre: string; first: number; done: number; total: number}[] = [];
  steps.forEach((s, i) => {
    let sec = sections.find((x) => x.nombre === s.seccion);
    if (!sec) sections.push((sec = {nombre: s.seccion, first: i, done: 0, total: 0}));
    sec.total += 1;
    if (answers[`${s.kind}:${s.id}`] !== undefined) sec.done += 1;
  });

  const pending = steps
    .map((s, i) => ({s, i}))
    .filter(({s}) => answers[`${s.kind}:${s.id}`] === undefined);

  const pad = (n: number) => String(n).padStart(2, '0');
  const sectionNow = step?.seccion ?? (isVote ? 'Evalúa tu equipo' : 'Revisión');

  return (
    <div className={`area-${area} flex min-h-dvh flex-col`}>
      {/* Cabecera: salir, sección actual, guardado y avance segmentado */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-3 px-5">
          <Link href="/empleado" className="-ml-2 grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Salir del examen (se guarda)">
            <X className="h-5 w-5" aria-hidden />
          </Link>
          <p className="min-w-0 flex-1 truncate text-center text-[14px] font-medium text-ink">{sectionNow}</p>
          <SaveBadge state={save} />
        </div>
        <div className="mx-auto max-w-xl px-5 pb-3">
          <div
            className="flex gap-[3px]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={answeredCount}
            aria-label={`Examen de ${mes}: respuestas completadas`}
          >
            {Array.from({length: total}, (_, i) => {
              const s = steps[i];
              const done = s ? answers[`${s.kind}:${s.id}`] !== undefined : vote !== undefined;
              return (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    i === index ? 'bg-ink' : done ? 'bg-accent' : 'bg-line'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-6 pt-8">
        {step && (
          <section key={`${step.kind}-${step.id}`} className="rise flex flex-1 flex-col">
            <p className="num font-mono text-[13px] text-ink-3">
              <span className="text-accent">{pad(index + 1)}</span> / {pad(total)}
            </p>
            <h1 className="mt-3 text-[26px] leading-[1.18] tracking-[-0.035em] text-ink text-pretty sm:text-[30px]">{step.texto}</h1>
            {step.kind === 'autoeval' && <p className="mt-3 text-[14px] text-ink-3">No tiene nota. Responde con sinceridad.</p>}

            <div className="mt-8 space-y-2.5" role="radiogroup" aria-label={step.texto}>
              {step.opciones.map((op, i) => {
                const selected = answers[`${step.kind}:${step.id}`] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(i)}
                    className={`group flex min-h-[60px] w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-[16px] leading-snug transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.995] ${
                      selected
                        ? 'border-accent bg-accent-soft text-ink shadow-[0_0_0_3px_#f0360a1a]'
                        : 'border-line bg-paper text-ink shadow-[var(--shadow-soft)] hover:border-[#d4d4d4]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border font-mono text-[12px] transition-colors ${
                        selected ? 'border-accent bg-accent text-white' : 'border-line bg-subtle text-ink-3 group-hover:text-ink'
                      }`}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : String.fromCharCode(65 + i)}
                    </span>
                    {op}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {isVote && (
          <section className="rise flex flex-1 flex-col">
            <p className="num font-mono text-[13px] text-ink-3">
              <span className="text-accent">{pad(index + 1)}</span> / {pad(total)}
            </p>
            <h1 className="mt-3 text-[26px] leading-[1.18] tracking-[-0.035em] text-ink sm:text-[30px]">¿Quién es el compañero más amable de tu área?</h1>
            <p className="mt-3 text-[14px] text-ink-3">Tu voto es privado. Solo lo ve Gerencia.</p>
            <div className="mt-8 space-y-2.5">
              {companeros.map((c) => {
                const selected = vote === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => chooseVote(c.id)}
                    aria-pressed={selected}
                    className={`flex min-h-[60px] w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] ${
                      selected ? 'border-accent bg-accent-soft shadow-[0_0_0_3px_#f0360a1a]' : 'border-line bg-paper shadow-[var(--shadow-soft)] hover:border-[#d4d4d4]'
                    }`}
                  >
                    <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-medium ${selected ? 'bg-accent text-white' : 'border border-line bg-subtle text-ink-2'}`}>
                      {initials(c.nombre)}
                    </span>
                    <span>
                      <span className="block text-[16px] text-ink">{c.nombre}</span>
                      <span className="block text-[13px] text-ink-3">{c.puesto}</span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => chooseVote(null)}
                aria-pressed={vote === null}
                className={`w-full rounded-xl px-4 py-3 text-[15px] ${vote === null ? 'bg-subtle text-ink' : 'text-ink-3 hover:bg-subtle hover:text-ink'}`}
              >
                Prefiero no votar
              </button>
            </div>
          </section>
        )}

        {isReview && (
          <section className="rise flex flex-1 flex-col">
            <h1 className="text-[32px] leading-[1.08] tracking-[-0.045em] text-ink">
              {pending.length === 0 ? 'Todo listo para enviar.' : `Te faltan ${pending.length} respuestas.`}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
              {pending.length === 0 ? 'Revisa si quieres cambiar algo. Una vez enviado ya no se puede modificar.' : 'Toca un tema o una pregunta para completarla.'}
            </p>

            <ul className="frame mt-7 divide-y divide-line">
              {sections.map((sec) => (
                <li key={sec.nombre}>
                  <button type="button" onClick={() => setIndex(sec.first)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-subtle">
                    <span className="text-[15px] text-ink">{sec.nombre}</span>
                    <span className={`num flex items-center gap-1.5 font-mono text-[13px] ${sec.done === sec.total ? 'text-ok' : 'text-wip'}`}>
                      {sec.done === sec.total && <Check className="h-3.5 w-3.5" aria-hidden />}
                      {sec.done}/{sec.total}
                    </span>
                  </button>
                </li>
              ))}
              {hasVote && (
                <li>
                  <button type="button" onClick={() => setIndex(steps.length)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-subtle">
                    <span className="text-[15px] text-ink">Evalúa tu equipo</span>
                    <span className={`flex items-center gap-1.5 text-[13px] ${vote !== undefined ? 'text-ok' : 'text-wip'}`}>
                      {vote !== undefined && <Check className="h-3.5 w-3.5" aria-hidden />}
                      {vote === undefined ? 'Pendiente' : vote === null ? 'Sin voto' : 'Votaste'}
                    </span>
                  </button>
                </li>
              )}
            </ul>

            {pending.length > 0 && (
              <ul className="mt-5 space-y-2">
                {pending.slice(0, 8).map(({s, i}) => (
                  <li key={`${s.kind}-${s.id}`}>
                    <button type="button" onClick={() => setIndex(i)} className="flex w-full items-start gap-3 rounded-lg border border-line px-4 py-3 text-left hover:bg-subtle">
                      <span className="num pt-0.5 font-mono text-[13px] text-accent">{pad(i + 1)}</span>
                      <span className="line-clamp-2 text-[14px] text-ink">{s.texto}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <p role="alert" className="mt-5 rounded-lg bg-bad-soft px-3.5 py-2.5 text-[14px] text-bad">
                {error}
              </p>
            )}

            <div className="mt-auto pt-10">
              <button type="button" onClick={submit} disabled={pending.length > 0 || sending} className={`${btn.primary} h-12 w-full text-[16px]`}>
                {sending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
                Enviar examen
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </section>
        )}

        {!isReview && error && (
          <p role="alert" className="mt-5 rounded-lg bg-bad-soft px-3.5 py-2.5 text-[14px] text-bad">
            {error}
          </p>
        )}

        <nav className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className={`${btn.ghost} h-11 text-[15px] disabled:invisible`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Anterior
          </button>
          {!isReview && (
            <button type="button" onClick={() => setIndex((i) => Math.min(total, i + 1))} className={`${btn.secondary} h-11 text-[15px]`}>
              {index === total - 1 ? 'Revisar' : 'Siguiente'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}

function SaveBadge({state}: {state: SaveState}) {
  const base = 'flex w-[88px] shrink-0 items-center justify-end gap-1.5 text-[12.5px]';
  if (state === 'saving')
    return (
      <span className={`${base} text-ink-3`}>
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> Guardando
      </span>
    );
  if (state === 'error')
    return (
      <span className={`${base} text-bad`}>
        <CloudOff className="h-3.5 w-3.5" aria-hidden /> Sin guardar
      </span>
    );
  if (state === 'saved')
    return (
      <span className={`${base} text-ok`}>
        <Check className="h-3.5 w-3.5" aria-hidden /> Guardado
      </span>
    );
  return <span className={base} />;
}
