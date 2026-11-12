import {monthName} from '@/lib/exam';
import type {TrendPoint} from '@/lib/stats';

// Gráficos livianos (HTML + SVG, sin librerías) para el panel de Gerencia.
// Barras finas con punta redondeada, 2px de aire entre segmentos, ejes y guías tenues,
// y el valor siempre escrito en texto (el color nunca es la única pista).

export interface Segment {
  key: string;
  label: string;
  n: number;
  color: string;
}

/** Barra apilada horizontal: cuántos están en cada estado. */
export function StackedBar({segments, total}: {segments: Segment[]; total: number}) {
  const visible = segments.filter((s) => s.n > 0);
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px]" role="img" aria-label={visible.map((s) => `${s.label}: ${s.n}`).join(', ')}>
        {total === 0 ? (
          <span className="h-full w-full rounded-[4px] bg-line-2" />
        ) : (
          visible.map((s, i) => (
            <span
              key={s.key}
              title={`${s.label}: ${s.n} de ${total}`}
              className={`bar-grow h-full transition-opacity hover:opacity-80 ${i === 0 ? 'rounded-l-[4px]' : ''} ${i === visible.length - 1 ? 'rounded-r-[4px]' : ''}`}
              style={{width: `${(s.n / total) * 100}%`, background: s.color, animationDelay: `${i * 80}ms`}}
            />
          ))
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[13.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{background: s.color}} aria-hidden />
            <span className="text-ink-2">{s.label}</span>
            <span className="num ml-auto font-mono text-[13px] text-ink">{s.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Histograma de notas: cuántos empleados cayeron en cada tramo. */
export function GradeColumns({buckets, min}: {buckets: {label: string; desde: number; hasta: number; nombres: string[]}[]; min: number}) {
  const max = Math.max(1, ...buckets.map((b) => b.nombres.length));
  return (
    <div>
      <div className="flex h-40 items-end gap-2 border-b border-line sm:gap-3">
        {buckets.map((b, i) => {
          const n = b.nombres.length;
          const pass = b.desde >= min;
          return (
            <div key={b.label} className="group flex h-full flex-1 flex-col items-center justify-end" title={n ? `${b.label}: ${b.nombres.join(', ')}` : `${b.label}: nadie`}>
              <span className="num mb-1 font-mono text-[12.5px] text-ink">{n || ''}</span>
              <span
                className="col-grow w-full max-w-[28px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{height: n ? `${(n / max) * 100}%` : 2, background: n ? (pass ? 'var(--color-ok)' : 'var(--color-bad)') : 'var(--color-line)', animationDelay: `${i * 60}ms`}}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {buckets.map((b) => (
          <span key={b.label} className="num flex-1 text-center font-mono text-[11px] text-ink-3">
            {b.label}
          </span>
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-ink-2">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-ok" aria-hidden /> Aprobado ({min} o más)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-bad" aria-hidden /> Reprobado
        </li>
      </ul>
    </div>
  );
}

/** Línea del promedio mensual con la nota mínima como referencia.
 *  Las formas van en SVG estirable; textos y puntos en HTML para que no se achiquen en el teléfono. */
export function TrendChart({points, min}: {points: TrendPoint[]; min: number}) {
  const vals = points.map((p) => p.promedio).filter((v): v is number => v !== null);
  const lo = Math.max(0, Math.floor((Math.min(min, ...vals) - 10) / 10) * 10);
  const hi = 100;
  const xp = (i: number) => (points.length === 1 ? 50 : 4 + (i * 92) / (points.length - 1)); // % ancho
  const yp = (v: number) => ((hi - v) / (hi - lo)) * 100; // % alto
  const lastIdx = points.reduce((k, p, i) => (p.promedio !== null ? i : k), -1);

  const runs: {i: number; v: number}[][] = [];
  let cur: {i: number; v: number}[] = [];
  points.forEach((p, i) => {
    if (p.promedio === null) {
      if (cur.length) runs.push(cur);
      cur = [];
    } else cur.push({i, v: p.promedio});
  });
  if (cur.length) runs.push(cur);

  return (
    <div role="img" aria-label={points.map((p) => `${monthName(p.mes)}: ${p.promedio ?? 'sin datos'}`).join(', ')}>
      <div className="flex gap-2">
        {/* Eje Y */}
        <div className="relative h-44 w-7 shrink-0 font-mono text-[11px] text-ink-3" aria-hidden>
          {[hi, Math.round((hi + lo) / 2), lo].map((v) => (
            <span key={v} className="num absolute right-0 -translate-y-1/2" style={{top: `${yp(v)}%`}}>
              {v}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            {[hi, (hi + lo) / 2, lo].map((v) => (
              <line key={v} x1="0" x2="100" y1={yp(v)} y2={yp(v)} stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <line x1="0" x2="100" y1={yp(min)} y2={yp(min)} stroke="var(--color-bad)" strokeOpacity="0.6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {runs.map((run, k) => (
              <g key={k}>
                {run.length > 1 && (
                  <path
                    d={`M${xp(run[0].i)},${yp(run[0].v)} ${run.slice(1).map((p) => `L${xp(p.i)},${yp(p.v)}`).join(' ')} L${xp(run[run.length - 1].i)},100 L${xp(run[0].i)},100 Z`}
                    fill="var(--color-accent)"
                    fillOpacity="0.07"
                  />
                )}
                <polyline
                  points={run.map((p) => `${xp(p.i)},${yp(p.v)}`).join(' ')}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>
          <span className="absolute right-0 -translate-y-full pb-0.5 text-[11.5px] text-bad" style={{top: `${yp(min)}%`}}>
            Mínima {min}
          </span>
          {points.map((p, i) =>
            p.promedio === null ? null : (
              <span
                key={p.mes}
                className="group absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{left: `${xp(i)}%`, top: `${yp(p.promedio)}%`}}
                title={`${monthName(p.mes, true)}: promedio ${p.promedio}, rindieron ${p.rindieron} de ${p.total}`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-paper transition-transform group-hover:scale-150" />
                {i === lastIdx && (
                  <span className="num absolute bottom-full font-mono text-[12.5px] font-medium text-ink">{p.promedio}</span>
                )}
              </span>
            )
          )}
        </div>
      </div>
      <div className="relative ml-9 mt-2 h-4">
        {points.map((p, i) => (
          <span key={p.mes} className="absolute -translate-x-1/2 text-[11.5px] text-ink-3" style={{left: `${xp(i)}%`}}>
            {monthName(p.mes).charAt(0).toUpperCase() + monthName(p.mes).slice(1, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontales de porcentaje con la marca de la nota mínima. */
export function PercentBars({items, min}: {items: {key: string; label: string; pct: number; detail?: string}[]; min: number}) {
  return (
    <ul className="space-y-4">
      {items.map((t, i) => {
        const low = t.pct < min;
        return (
          <li key={t.key} title={t.detail}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0 text-ink">{t.label}</span>
              <span className={`num shrink-0 font-mono text-[13px] ${low ? 'text-bad' : 'text-ink-2'}`}>{t.pct}%</span>
            </div>
            <div className="relative mt-1.5 h-2 rounded-full bg-line-2">
              <div className={`bar-grow h-full rounded-full ${low ? 'bg-bad' : 'bg-ok'}`} style={{width: `${Math.max(t.pct, 1)}%`, animationDelay: `${i * 60}ms`}} />
              <span className="absolute -top-1 h-4 w-px bg-ink/40" style={{left: `${min}%`}} aria-hidden />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
