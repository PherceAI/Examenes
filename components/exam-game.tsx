'use client';

import {useEffect, useMemo, useRef, useState, useTransition} from 'react';
import Link from 'next/link';
import {Check, Flame, LoaderCircle, RotateCw, Star, ThumbsDown, ThumbsUp, Volume2, VolumeX, X} from 'lucide-react';
import {enviarExamen, guardarRespuesta} from '@/app/actions';
import {initials} from '@/lib/exam';
import {pointsFor, RACHA_BONO} from '@/lib/game';
import type {AreaId, QuestionType} from '@/lib/types';

export interface GameStep {
  kind: 'pregunta' | 'autoeval';
  id: string;
  seccion: string;
  tipo: QuestionType;
  texto: string;
  opciones: string[];
  /** Ya respondida: lo elegido y, si tiene nota, la correcta. */
  hecho?: {elegida: number; correcta?: number};
}

interface Companero {
  id: string;
  nombre: string;
  puesto: string;
}

type Screen =
  | {kind: 'tema'; seccion: string; temaIdx: number; first: number; count: number; autoeval: boolean}
  | {kind: 'paso'; step: number}
  | {kind: 'voto'}
  | {kind: 'fin'};

const ELOGIOS = ['¡Muy bien!', '¡Correcto!', '¡Excelente!', '¡Así se hace!', '¡Bien hecho!', '¡Perfecto!'];
const ANIMOS = ['Casi. La correcta es:', 'No era esa. La correcta es:', 'Uy, era otra:'];

// ───── Sonidos cortos generados en el teléfono (sin archivos que descargar) ─────
let ctx: AudioContext | null = null;
function tone(notes: [number, number][], type: OscillatorType = 'sine') {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [freq, dur] of notes) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
      t += dur * 0.85;
    }
  } catch {
    /* sin audio: no pasa nada */
  }
}
const sfx = {
  ok: () => tone([[660, 0.09], [990, 0.16]], 'triangle'),
  bad: () => tone([[220, 0.16], [185, 0.22]], 'sine'),
  tap: () => tone([[520, 0.04]], 'triangle'),
  done: () => tone([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]], 'triangle'),
};

export function ExamGame({
  mes,
  area,
  steps,
  companeros,
  initialVote,
}: {
  mes: string;
  area: AreaId;
  steps: GameStep[];
  companeros: Companero[];
  initialVote?: string | null;
}) {
  const hasVote = companeros.length > 0;

  // Pantallas en orden: intro de cada tema → sus preguntas → … → sobre ti → voto → fin.
  const screens = useMemo<Screen[]>(() => {
    const out: Screen[] = [];
    let temaIdx = 0;
    steps.forEach((s, i) => {
      if (i === 0 || steps[i - 1].seccion !== s.seccion) {
        const count = steps.slice(i).findIndex((x) => x.seccion !== s.seccion);
        out.push({kind: 'tema', seccion: s.seccion, temaIdx: temaIdx++, first: i, count: count < 0 ? steps.length - i : count, autoeval: s.kind === 'autoeval'});
      }
      out.push({kind: 'paso', step: i});
    });
    if (hasVote) out.push({kind: 'voto'});
    out.push({kind: 'fin'});
    return out;
  }, [steps, hasVote]);

  const temas = useMemo(() => screens.filter((s): s is Extract<Screen, {kind: 'tema'}> => s.kind === 'tema'), [screens]);

  const [done, setDone] = useState<Record<number, {elegida: number; correcta?: number}>>(() => {
    const d: Record<number, {elegida: number; correcta?: number}> = {};
    steps.forEach((s, i) => s.hecho && (d[i] = s.hecho));
    return d;
  });
  const [vote, setVote] = useState<string | null | undefined>(initialVote);

  // Retomar donde quedó: primera pregunta sin responder (en la intro de su tema si es la primera del tema).
  const [screen, setScreen] = useState(() => {
    const firstOpen = steps.findIndex((s) => !s.hecho);
    if (firstOpen < 0) return hasVote && initialVote === undefined ? screens.findIndex((s) => s.kind === 'voto') : screens.length - 1;
    const tema = screens.findIndex((s) => s.kind === 'tema' && s.first === firstOpen);
    return tema >= 0 ? tema : screens.findIndex((s) => s.kind === 'paso' && s.step === firstOpen);
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [voteSel, setVoteSel] = useState<string | null | undefined>(initialVote);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [sending, startSending] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const finStarted = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('eval-sonido') === '0') setSound(false);
    } catch {}
  }, []);
  function toggleSound() {
    setSound((v) => {
      try {
        localStorage.setItem('eval-sonido', v ? '0' : '1');
      } catch {}
      return !v;
    });
  }
  const play = (k: keyof typeof sfx) => sound && sfx[k]();

  // Racha actual de aciertos, recorriendo lo respondido en orden.
  const {racha, puntos} = useMemo(() => {
    let r = 0;
    let p = 0;
    steps.forEach((s, i) => {
      const d = done[i];
      if (s.kind !== 'pregunta' || !d) return;
      if (d.elegida === d.correcta) {
        r += 1;
        p += pointsFor(r);
      } else r = 0;
    });
    return {racha: r, puntos: p};
  }, [done, steps]);

  const cur = screens[screen];
  const step = cur.kind === 'paso' ? steps[cur.step] : null;
  const result = cur.kind === 'paso' ? done[cur.step] : undefined;
  const totalUnits = steps.length + (hasVote ? 1 : 0);
  const doneUnits = Object.keys(done).length + (hasVote && vote !== undefined ? 1 : 0);

  function next() {
    setSelected(null);
    setError(null);
    setScreen((i) => Math.min(i + 1, screens.length - 1));
  }

  async function check() {
    if (!step || selected === null || cur.kind !== 'paso') return;
    const idx = cur.step;
    setChecking(true);
    setError(null);
    try {
      if (step.kind === 'pregunta') {
        const res = await guardarRespuesta('pregunta', step.id, selected);
        if (res.error || res.correcta === undefined || res.elegida === undefined) {
          setError(res.error || 'No se pudo guardar. Intenta otra vez.');
          return;
        }
        const ok = res.elegida === res.correcta;
        setDone((d) => ({...d, [idx]: {elegida: res.elegida!, correcta: res.correcta}}));
        play(ok ? 'ok' : 'bad');
        if (!ok) navigator.vibrate?.(80);
      } else {
        const res = await guardarRespuesta('autoeval', step.id, selected === 0);
        if (res.error) {
          setError(res.error);
          return;
        }
        setDone((d) => ({...d, [idx]: {elegida: selected}}));
        play('tap');
        next();
      }
    } catch {
      setError('Sin conexión. Revisa tu señal y vuelve a tocar el botón.');
    } finally {
      setChecking(false);
    }
  }

  async function sendVote(id: string | null) {
    setChecking(true);
    setError(null);
    try {
      const res = await guardarRespuesta('voto', 'voto', id);
      if (res.error) return setError(res.error);
      setVote(id);
      play('tap');
      next();
    } catch {
      setError('Sin conexión. Revisa tu señal y vuelve a tocar el botón.');
    } finally {
      setChecking(false);
    }
  }

  function submit() {
    setSendError(null);
    startSending(async () => {
      try {
        const res = await enviarExamen();
        if (res?.error) setSendError(res.error);
      } catch {
        setSendError('Sin conexión. Revisa tu señal e inténtalo otra vez.');
      }
    });
  }

  // Al llegar al final se envía solo; no hay que volver a revisar nada.
  useEffect(() => {
    if (cur.kind === 'fin' && !finStarted.current) {
      finStarted.current = true;
      play('done');
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.kind]);

  const correct = result && result.correcta !== undefined && result.elegida === result.correcta;
  const praise = ELOGIOS[(cur.kind === 'paso' ? cur.step : 0) % ELOGIOS.length];
  const nudge = ANIMOS[(cur.kind === 'paso' ? cur.step : 0) % ANIMOS.length];

  return (
    <div className={`area-${area} flex min-h-dvh flex-col bg-paper`}>
      {/* Cabecera: salir, barra de avance, racha y sonido */}
      <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-xl items-center gap-3 px-4">
          <Link href="/empleado" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Salir (tu avance queda guardado)">
            <X className="h-6 w-6" aria-hidden />
          </Link>
          <div
            className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-line-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalUnits}
            aria-valuenow={doneUnits}
            aria-label={`Lección de ${mes}: ${doneUnits} de ${totalUnits}`}
          >
            <div className="game-bar h-full rounded-full bg-accent" style={{width: `${Math.max(4, (doneUnits / totalUnits) * 100)}%`}} />
          </div>
          <span
            className={`flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-[15px] font-semibold transition-colors ${racha >= 2 ? 'text-accent' : 'text-ink-3'}`}
            aria-label={`Racha: ${racha} aciertos seguidos`}
          >
            <Flame key={racha} className={`h-5 w-5 ${racha >= 2 ? 'flame-pop fill-accent/20' : ''}`} aria-hidden />
            <span className="num">{racha}</span>
          </span>
          <button type="button" onClick={toggleSound} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-subtle hover:text-ink" aria-label={sound ? 'Silenciar sonidos' : 'Activar sonidos'} aria-pressed={!sound}>
            {sound ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-4 pt-4">
        {/* Intro de tema: el camino de la lección */}
        {cur.kind === 'tema' && (
          <section key={`t-${screen}`} className="pop-in flex flex-1 flex-col">
            <p className="text-[15px] font-medium text-accent">
              {cur.autoeval ? 'Última parte' : `Tema ${cur.temaIdx + 1} de ${temas.filter((t) => !t.autoeval).length}`}
            </p>
            <h1 className="mt-1.5 text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] text-ink text-balance">{cur.seccion}</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
              {cur.autoeval
                ? `${cur.count} preguntas sobre cómo trabajas. No tienen nota: responde con sinceridad.`
                : `${cur.count} preguntas. Cada acierto suma ${pointsFor(1)} puntos y, desde el tercero seguido, ${pointsFor(RACHA_BONO)}.`}
            </p>

            <ol className="mt-8 space-y-1" aria-label="Temas de la lección">
              {temas.map((t) => {
                const answered = steps.slice(t.first, t.first + t.count).filter((_, k) => done[t.first + k]).length;
                const hits = steps.slice(t.first, t.first + t.count).filter((s, k) => {
                  const d = done[t.first + k];
                  return s.kind === 'pregunta' && d && d.elegida === d.correcta;
                }).length;
                const complete = answered === t.count;
                const now = t.temaIdx === cur.temaIdx;
                return (
                  <li key={t.seccion} className={`flex items-center gap-3.5 rounded-2xl px-3 py-2.5 ${now ? 'bg-accent-soft' : ''}`}>
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-b-4 ${
                        complete ? 'border-ok bg-ok text-white' : now ? 'border-accent-strong bg-accent text-white' : 'border-line bg-paper text-ink-3'
                      }`}
                      aria-hidden
                    >
                      {complete ? <Check className="h-5 w-5" strokeWidth={3} /> : now ? <Star className="h-5 w-5 fill-white" /> : <span className="text-[14px] font-semibold">{t.temaIdx + 1}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[15px] ${now ? 'font-semibold text-ink' : complete ? 'text-ink' : 'text-ink-3'}`}>{t.seccion}</span>
                      <span className="block text-[13px] text-ink-3">
                        {complete ? (t.autoeval ? 'Listo' : `${hits} de ${t.count} correctas`) : `${t.count} preguntas`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Pregunta */}
        {step && cur.kind === 'paso' && (
          <section key={`p-${cur.step}`} className="slide-in flex flex-1 flex-col">
            <p className="text-[14px] font-medium text-ink-3">{step.seccion}</p>
            <h1 className="mt-2 text-[24px] leading-[1.22] font-semibold tracking-[-0.03em] text-ink text-pretty sm:text-[28px]">{step.texto}</h1>

            {step.tipo === 'sino' ? (
              <div className="mt-8 grid grid-cols-2 gap-3" role="radiogroup" aria-label={step.texto}>
                {step.opciones.map((op, i) => (
                  <Choice key={i} i={i} label={op} big step={step} result={result} selected={selected} onPick={(v) => (setSelected(v), play('tap'))} />
                ))}
              </div>
            ) : (
              <div className="mt-7 space-y-3" role="radiogroup" aria-label={step.texto}>
                {step.opciones.map((op, i) => (
                  <Choice key={i} i={i} label={op} step={step} result={result} selected={selected} onPick={(v) => (setSelected(v), play('tap'))} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Evalúa a tu equipo */}
        {cur.kind === 'voto' && (
          <section className="slide-in flex flex-1 flex-col">
            <p className="text-[14px] font-medium text-ink-3">Evalúa a tu equipo</p>
            <h1 className="mt-2 text-[24px] leading-[1.22] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">¿Quién es el compañero más amable de tu área?</h1>
            <p className="mt-2 text-[15px] text-ink-3">Tu voto es privado. Solo lo ve Gerencia.</p>
            <div className="mt-6 space-y-2.5">
              {companeros.map((c) => {
                const on = voteSel === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => (setVoteSel(c.id), play('tap'))}
                    aria-pressed={on}
                    className={`tile flex min-h-[64px] w-full items-center gap-3.5 px-4 py-3 text-left ${on ? 'tile-on' : ''}`}
                  >
                    <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold ${on ? 'bg-accent text-white' : 'bg-subtle text-ink-2'}`}>
                      {initials(c.nombre)}
                    </span>
                    <span>
                      <span className="block text-[16px] font-medium text-ink">{c.nombre}</span>
                      <span className="block text-[13px] text-ink-3">{c.puesto}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Final: se envía solo */}
        {cur.kind === 'fin' && (
          <section className="pop-in flex flex-1 flex-col items-center justify-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full border-2 border-b-[6px] border-accent-strong bg-accent text-white">
              {sending || !sendError ? <LoaderCircle className="h-9 w-9 animate-spin" aria-hidden /> : <RotateCw className="h-9 w-9" aria-hidden />}
            </span>
            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.035em] text-ink">{sendError ? 'No se pudo enviar' : '¡Terminaste!'}</h1>
            <p className="mt-2 max-w-xs text-[16px] leading-relaxed text-ink-2">{sendError || 'Estamos calculando tu resultado…'}</p>
            {sendError && (
              <button type="button" onClick={submit} disabled={sending} className="btn-game btn-game-accent mt-8 w-full max-w-xs">
                Intentar otra vez
              </button>
            )}
          </section>
        )}
      </main>

      {/* Barra inferior: comprobar / continuar, con la respuesta al instante */}
      {cur.kind !== 'fin' && (
        <footer
          className={`sticky bottom-0 z-20 border-t-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 transition-colors duration-200 ${
            result && step?.kind === 'pregunta' ? (correct ? 'border-transparent bg-ok-soft' : 'border-transparent bg-bad-soft') : 'border-line-2 bg-paper'
          }`}
        >
          <div className="mx-auto max-w-xl px-5">
            {result && step?.kind === 'pregunta' && (
              <div className="feedback-in mb-4 flex items-start gap-3" role="status" aria-live="polite">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${correct ? 'bg-ok' : 'bg-bad'}`} aria-hidden>
                  {correct ? <Check className="h-6 w-6" strokeWidth={3} /> : <X className="h-6 w-6" strokeWidth={3} />}
                </span>
                <div className="min-w-0">
                  <p className={`text-[20px] font-semibold tracking-[-0.02em] ${correct ? 'text-ok' : 'text-bad'}`}>
                    {correct ? (racha >= RACHA_BONO ? `¡${racha} seguidas!` : praise) : nudge}
                  </p>
                  {correct ? (
                    <p className="text-[15px] text-ok">+{pointsFor(racha)} puntos{racha >= RACHA_BONO ? ' con bono de racha' : ''} · {puntos} en total</p>
                  ) : (
                    <p className="text-[16px] leading-snug text-bad">{step.opciones[result.correcta!]}</p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mb-3 rounded-xl bg-bad-soft px-4 py-2.5 text-[14px] text-bad">
                {error}
              </p>
            )}

            {cur.kind === 'tema' && (
              <button type="button" onClick={() => (play('tap'), next())} className="btn-game btn-game-accent w-full">
                {cur.first === 0 ? '¡Empezar!' : 'Continuar'}
              </button>
            )}
            {cur.kind === 'paso' &&
              (result && step?.kind === 'pregunta' ? (
                <button type="button" onClick={next} autoFocus className={`btn-game w-full ${correct ? 'btn-game-ok' : 'btn-game-bad'}`}>
                  Continuar
                </button>
              ) : (
                <button type="button" onClick={check} disabled={selected === null || checking} className="btn-game btn-game-accent w-full">
                  {checking && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />}
                  {step?.kind === 'autoeval' ? 'Continuar' : 'Comprobar'}
                </button>
              ))}
            {cur.kind === 'voto' && (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => voteSel && sendVote(voteSel)} disabled={!voteSel || checking} className="btn-game btn-game-accent w-full">
                  {checking && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />}
                  Votar
                </button>
                <button type="button" onClick={() => sendVote(null)} disabled={checking} className="h-11 rounded-xl text-[15px] font-medium text-ink-3 hover:bg-subtle hover:text-ink">
                  Prefiero no votar
                </button>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

function Choice({
  i,
  label,
  big = false,
  step,
  result,
  selected,
  onPick,
}: {
  i: number;
  label: string;
  big?: boolean;
  step: GameStep;
  result?: {elegida: number; correcta?: number};
  selected: number | null;
  onPick: (i: number) => void;
}) {
  const graded = result && step.kind === 'pregunta';
  const isRight = graded && result.correcta === i;
  const isWrongPick = graded && result.elegida === i && result.correcta !== i;
  const on = result ? result.elegida === i : selected === i;
  const state = isRight ? 'tile-ok' : isWrongPick ? 'tile-bad' : graded ? 'tile-dim' : on ? 'tile-on' : '';
  const Icon = step.tipo === 'sino' ? (i === 0 ? ThumbsUp : ThumbsDown) : null;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={!!result}
      onClick={() => onPick(i)}
      className={`tile w-full text-left ${state} ${
        big ? 'flex min-h-[132px] flex-col items-center justify-center gap-2.5 px-3 py-5 text-center' : 'flex min-h-[64px] items-center gap-3.5 px-4 py-3.5'
      } ${isRight ? 'pulse-ok' : isWrongPick ? 'shake' : ''}`}
    >
      {Icon ? (
        <Icon className={`h-8 w-8 ${state ? '' : 'text-ink-3'}`} aria-hidden />
      ) : (
        <span aria-hidden className="tile-key grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 text-[14px] font-semibold">
          {isRight ? <Check className="h-4 w-4" strokeWidth={3} /> : isWrongPick ? <X className="h-4 w-4" strokeWidth={3} /> : String.fromCharCode(65 + i)}
        </span>
      )}
      <span className={big ? 'text-[20px] font-semibold' : 'text-[16px] leading-snug'}>{label}</span>
    </button>
  );
}
