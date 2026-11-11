import {areaById} from '@/lib/areas';
import {initials, monthName, type MonthStatus} from '@/lib/exam';
import type {AreaId} from '@/lib/types';

// ───── Estilos base compartidos (inspirados en la estética de laravel.com) ─────

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 text-white shadow-[var(--shadow-soft)] transition-[background-color,transform] hover:bg-accent-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#d4d4d4] disabled:shadow-none',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 text-ink shadow-[var(--shadow-soft)] transition-colors hover:bg-subtle disabled:opacity-60',
  ghost: 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-ink-2 transition-colors hover:bg-subtle hover:text-ink',
  danger: 'inline-flex items-center justify-center gap-2 rounded-lg bg-bad px-3.5 text-white transition-colors hover:bg-[#a91818]',
};

export const field =
  'w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink shadow-[var(--shadow-soft)] outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_3px_#f0360a1f]';

export function Wordmark({sub, className = ''}: {sub?: string; className?: string}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
        <path d="M13.6 2 4.5 13.4h6.1L9.4 22l9.1-11.6h-6.1z" fill="var(--color-accent)" />
      </svg>
      <span className="text-[17px] font-medium tracking-[-0.03em] text-accent">Hotel Zeus</span>
      {sub && <span className="hidden border-l border-line pl-2.5 text-[14px] text-ink-3 sm:inline">{sub}</span>}
    </span>
  );
}

export function AreaDot({area, withLabel = false}: {area: AreaId; withLabel?: boolean}) {
  return (
    <span className={`area-${area} inline-flex items-center gap-2`}>
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--area)]" aria-hidden />
      {withLabel && <span>{areaById(area).nombre}</span>}
    </span>
  );
}

export function Avatar({nombre, area, size = 36}: {nombre: string; area: AreaId; size?: number}) {
  return (
    <span
      aria-hidden
      className={`area-${area} relative grid shrink-0 place-items-center rounded-full border border-line bg-subtle font-medium tracking-[-0.02em] text-ink-2`}
      style={{width: size, height: size, fontSize: size * 0.36}}
    >
      {initials(nombre)}
      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-[var(--area)]" />
    </span>
  );
}

const STATUS_LABEL: Record<MonthStatus, string> = {
  aprobado: 'Aprobado',
  reprobado: 'Reprobado',
  'en-curso': 'Sin terminar',
  pendiente: 'Pendiente',
  'sin-dato': 'Sin examen',
};

export function statusLabel(s: MonthStatus) {
  return STATUS_LABEL[s];
}

export function StatusPill({status, nota}: {status: MonthStatus; nota?: number}) {
  const tone: Record<MonthStatus, string> = {
    aprobado: 'bg-ok-soft text-ok',
    reprobado: 'bg-bad-soft text-bad',
    'en-curso': 'bg-wip-soft text-wip',
    pendiente: 'bg-paper text-ink-2 ring-1 ring-inset ring-line',
    'sin-dato': 'bg-subtle text-ink-3',
  };
  const dot: Record<MonthStatus, string> = {
    aprobado: 'bg-ok',
    reprobado: 'bg-bad',
    'en-curso': 'bg-wip',
    pendiente: 'bg-accent',
    'sin-dato': 'bg-[#d4d4d4]',
  };
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium whitespace-nowrap ${tone[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} aria-hidden />
      {statusLabel(status)}
      {typeof nota === 'number' && <span className="num font-mono text-[12px]">{nota}</span>}
    </span>
  );
}

export interface MonthResult {
  mes: string;
  status: MonthStatus;
  nota?: number;
}

/** Los últimos 12 meses como una tira de celdas con líneas finas. */
export function MonthStrip({months, live, compact = false}: {months: MonthResult[]; live?: string; compact?: boolean}) {
  if (compact) {
    return (
      <ol className="flex items-center gap-[3px]" aria-label="Últimos 12 meses">
        {months.map((m) => (
          <li
            key={m.mes}
            className="month-cell relative h-4 w-1.5 rounded-[2px] bg-[var(--tone)]"
            data-s={m.status}
            title={`${monthName(m.mes, true)}: ${statusLabel(m.status)}${typeof m.nota === 'number' ? ` · ${m.nota}` : ''}`}
          >
            <span className="sr-only">
              {monthName(m.mes, true)}: {statusLabel(m.status)}
            </span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="grid grid-cols-6 overflow-hidden rounded-lg border border-line sm:grid-cols-12" aria-label="Últimos 12 meses">
      {months.map((m, i) => (
        <li
          key={m.mes}
          className={`month-cell relative flex flex-col items-center gap-1.5 border-line px-1 py-2.5 ${i % 6 !== 5 ? 'border-r' : 'sm:border-r'} ${i < 6 ? 'border-b sm:border-b-0' : ''} last:border-r-0`}
          data-s={m.status}
        >
          <span className="text-[11px] font-medium capitalize text-ink-3">{monthName(m.mes).slice(0, 3)}</span>
          <span className="flex h-5 items-center">
            {typeof m.nota === 'number' ? (
              <span className="num font-mono text-[13px] font-medium text-[var(--tone)]">{m.nota}</span>
            ) : (
              <span className={`h-2 w-2 rounded-full bg-[var(--tone)] ${m.mes === live ? 'live-dot' : ''}`} />
            )}
          </span>
          <span className="sr-only">
            {monthName(m.mes, true)}: {statusLabel(m.status)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Notice({tone, children}: {tone: 'ok' | 'bad' | 'wip'; children: React.ReactNode}) {
  const cls = {ok: 'bg-ok-soft text-ok', bad: 'bg-bad-soft text-bad', wip: 'bg-wip-soft text-wip'}[tone];
  return (
    <p role={tone === 'bad' ? 'alert' : 'status'} className={`rounded-lg px-3.5 py-2.5 text-[14px] ${cls}`}>
      {children}
    </p>
  );
}
