import Link from 'next/link';
import {AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Info, UserPlus} from 'lucide-react';
import {GradeColumns, PercentBars, StackedBar, TrendChart} from '@/components/charts';
import {PageHeader, Panel} from '@/components/manager-shell';
import {MonthPicker} from '@/components/month-picker';
import {Avatar, btn, MonthStrip, StatusPill} from '@/components/ui';
import {AREAS} from '@/lib/areas';
import {readDb} from '@/lib/db';
import {examWindow, monthName, type MonthStatus} from '@/lib/exam';
import {monthInsights, type InsightTone} from '@/lib/insights';
import {punchMonths} from '@/lib/months';
import {availableMonths, gradeBuckets, monthRows, monthTrend, questionStats, topicStats} from '@/lib/stats';

const FILTERS: {id: 'todos' | MonthStatus; label: string}[] = [
  {id: 'todos', label: 'Todos'},
  {id: 'pendiente', label: 'Sin empezar'},
  {id: 'en-curso', label: 'Sin terminar'},
  {id: 'reprobado', label: 'Reprobados'},
  {id: 'aprobado', label: 'Aprobados'},
  {id: 'sin-dato', label: 'No rindieron'},
];

const STATUS_COLOR: Record<MonthStatus, string> = {
  aprobado: 'var(--color-ok)',
  reprobado: 'var(--color-bad)',
  'en-curso': '#eab308',
  pendiente: '#a3a3a3',
  'sin-dato': '#d4d4d4',
};

const TONE: Record<InsightTone, {icon: typeof Info; cls: string}> = {
  ok: {icon: CheckCircle2, cls: 'text-ok'},
  bad: {icon: AlertTriangle, cls: 'text-bad'},
  wip: {icon: Clock3, cls: 'text-wip'},
  info: {icon: Info, cls: 'text-ink-3'},
};

export default async function Resumen({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const sp = await searchParams;
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : w.mes;
  const area = AREAS.some((a) => a.id === sp.area) ? sp.area : undefined;
  const estado = FILTERS.some((f) => f.id === sp.estado) ? (sp.estado as (typeof FILTERS)[number]['id']) : 'todos';
  const min = db.ajustes.notaMinima;

  const rows = monthRows(db, mes);
  const enviados = rows.filter((r) => r.attempt?.enviado);
  const count = (s: MonthStatus) => rows.filter((r) => r.status === s).length;
  const temas = topicStats(rows);
  const fallidas = questionStats(rows).slice(0, 5);
  const insights = monthInsights(db, mes);
  const visible = rows.filter((r) => (!area || r.emp.area === area) && (estado === 'todos' || r.status === estado));
  const trend = monthTrend(db, mes, 6);

  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {mes: mes === w.mes ? undefined : mes, area, estado: estado === 'todos' ? undefined : estado, ...patch};
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/gerencia?${s}#empleados` : '/gerencia#empleados';
  };

  const segmentos = (['aprobado', 'reprobado', 'en-curso', mes === w.mes ? 'pendiente' : 'sin-dato'] as MonthStatus[]).map((s) => ({
    key: s,
    label: FILTERS.find((f) => f.id === s)!.label,
    n: count(s),
    color: STATUS_COLOR[s],
  }));

  const areas = AREAS.map((a) => {
    const ar = rows.filter((r) => r.emp.area === a.id);
    const sent = ar.filter((r) => r.attempt?.enviado);
    const prom = sent.length ? Math.round(sent.reduce((n, r) => n + (r.attempt?.nota || 0), 0) / sent.length) : null;
    return {a, total: ar.length, sent: sent.length, prom};
  }).filter((x) => x.total > 0);

  return (
    <>
      <PageHeader title={monthName(mes, true)} description={mes === w.mes ? `Examen: ${w.label.toLowerCase()}.` : 'Mes cerrado.'} actions={<MonthPicker months={availableMonths(db)} value={mes} />} />

      <div className="space-y-6 px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
        {/* Lo que está pasando, en palabras */}
        <Panel title="Lo que está pasando">
          <ul className="divide-y divide-line">
            {insights.map((it, i) => {
              const {icon: Icon, cls} = TONE[it.tone];
              const body = (
                <>
                  <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${cls}`} aria-hidden />
                  <span className="flex-1 text-[15px] leading-relaxed text-ink">{it.text}</span>
                  {it.estado && <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-3" aria-hidden />}
                </>
              );
              return (
                <li key={i}>
                  {it.estado ? (
                    <Link href={q({estado: it.estado})} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-subtle">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-5 py-3.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        {rows.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="¿Quién ya rindió?">
              <div className="px-5 py-5">
                <p className="num text-[40px] leading-none font-medium tracking-[-0.05em] text-ink">
                  {enviados.length}
                  <span className="ml-1.5 text-[16px] font-normal tracking-normal text-ink-3">de {rows.length} empleados</span>
                </p>
                <div className="mt-5">
                  <StackedBar segments={segmentos} total={rows.length} />
                </div>
              </div>
            </Panel>

            <Panel title="Cómo les fue">
              <div className="px-5 py-5">
                {enviados.length ? (
                  <>
                    <p className="mb-4 text-[14px] text-ink-3">Cuántos empleados sacaron cada rango de nota.</p>
                    <GradeColumns buckets={gradeBuckets(rows)} min={min} />
                  </>
                ) : (
                  <EmptyChart text="Las notas aparecen apenas alguien envía el examen." />
                )}
              </div>
            </Panel>

            <Panel title="Promedio mes a mes">
              <div className="px-5 py-5">
                {trend.some((p) => p.promedio !== null) ? (
                  <>
                    <p className="mb-3 text-[14px] text-ink-3">Nota promedio del equipo en los últimos 6 meses. Si el punto queda bajo la línea roja, el equipo no alcanzó la nota mínima.</p>
                    <TrendChart points={trend} min={min} />
                  </>
                ) : (
                  <EmptyChart text="Cuando haya exámenes enviados verás aquí si el equipo mejora mes a mes." />
                )}
              </div>
            </Panel>

            <Panel title="Qué temas dominan">
              <div className="px-5 py-5">
                {temas.length ? (
                  <>
                    <p className="mb-4 text-[14px] text-ink-3">Porcentaje de respuestas correctas por tema. En rojo, los que están bajo la nota mínima (la rayita).</p>
                    <PercentBars items={temas.map((t) => ({key: t.topicId, label: t.nombre, pct: t.pct, detail: `${t.aciertos} de ${t.total} correctas`}))} min={min} />
                  </>
                ) : (
                  <EmptyChart text="Aparece cuando alguien envía el examen." />
                )}
              </div>
            </Panel>
          </div>
        )}

        {areas.length > 0 && (
          <Panel title="Por área">
            <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
              {areas.map(({a, total, sent, prom}, i) => {
                const selected = area === a.id;
                return (
                  <li key={a.id} className={`border-line ${i > 0 ? 'lg:border-l' : ''} ${i % 2 === 1 ? 'sm:border-l' : ''} ${i >= 2 ? 'sm:border-t lg:border-t-0' : ''}`}>
                    <Link href={q({area: selected ? undefined : a.id})} aria-current={selected ? 'true' : undefined} className={`area-${a.id} block px-5 py-4 transition-colors ${selected ? 'bg-subtle' : 'hover:bg-subtle'}`}>
                      <span className="flex items-center gap-2 text-[14px] text-ink">
                        <span className="h-2 w-2 rounded-full bg-[var(--area)]" aria-hidden />
                        {a.nombre}
                      </span>
                      <span className="mt-2 flex items-baseline gap-1.5">
                        <span className={`num text-[28px] leading-none font-medium tracking-[-0.04em] ${prom === null ? 'text-ink-3' : prom < min ? 'text-bad' : 'text-ink'}`}>{prom ?? '—'}</span>
                        <span className="text-[13px] text-ink-3">promedio</span>
                      </span>
                      <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-line-2" aria-hidden>
                        <span className="bar-grow block h-full rounded-full bg-[var(--area)]" style={{width: `${(sent / total) * 100}%`}} />
                      </span>
                      <span className="num mt-1.5 block text-[12.5px] text-ink-3">
                        {sent} de {total} rindieron
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section id="empleados" aria-label="Empleados del mes" className="min-w-0 scroll-mt-20">
            <h2 className="text-[20px] font-medium tracking-[-0.03em] text-ink">Empleados</h2>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => {
                const n = f.id === 'todos' ? rows.length : count(f.id);
                if (f.id !== 'todos' && n === 0) return null;
                const on = estado === f.id;
                return (
                  <Link
                    key={f.id}
                    href={q({estado: f.id === 'todos' ? undefined : f.id})}
                    aria-current={on ? 'true' : undefined}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] transition-colors ${on ? 'bg-ink text-white' : 'border border-line text-ink-2 hover:bg-subtle hover:text-ink'}`}
                  >
                    {f.label}
                    <span className={`num font-mono text-[12px] ${on ? 'text-white/60' : 'text-ink-3'}`}>{n}</span>
                  </Link>
                );
              })}
              {area && (
                <Link href={q({area: undefined})} className="ml-2 text-[13.5px] text-accent hover:underline">
                  Quitar filtro de área
                </Link>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="frame mt-4 px-6 py-14 text-center">
                <p className="text-[22px] tracking-[-0.03em] text-ink">Todavía no hay empleados.</p>
                <p className="mt-1.5 text-[15px] text-ink-3">Carga al personal con su cédula y un PIN para que puedan rendir el examen.</p>
                <Link href="/gerencia/empleados/nuevo" className={`${btn.primary} mt-6 h-11 text-[15px]`}>
                  <UserPlus className="h-4 w-4" aria-hidden /> Agregar empleado
                </Link>
              </div>
            ) : (
              <ul className="frame mt-4 divide-y divide-line">
                {visible.map((r) => {
                  const a = r.attempt;
                  const avance = a && !a.enviado ? Object.keys(a.respuestas).length : null;
                  return (
                    <li key={r.emp.id}>
                      <Link href={`/gerencia/empleados/${r.emp.id}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle sm:px-5">
                        <Avatar nombre={r.emp.nombre} area={r.emp.area} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] text-ink">{r.emp.nombre}</span>
                          <span className="block truncate text-[13px] text-ink-3">
                            {r.emp.puesto}
                            {avance !== null && a && ` · va en ${avance} de ${a.preguntas.length}`}
                            {a && Object.keys(a.contradicciones).length > 0 && <span className="text-bad"> · autoevaluación contradicha</span>}
                          </span>
                        </span>
                        <span className="hidden md:block">
                          <MonthStrip months={punchMonths(db, r.emp, mes)} compact />
                        </span>
                        <StatusPill status={r.status} nota={a?.enviado ? a.nota : undefined} />
                        <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-ink-3 group-hover:text-ink sm:block" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
                {visible.length === 0 && <li className="px-5 py-10 text-center text-[14px] text-ink-3">Nadie en este filtro.</li>}
              </ul>
            )}
          </section>

          <aside>
            <Panel title="Preguntas más falladas">
              {fallidas.length === 0 ? (
                <p className="px-5 py-4 text-[14px] text-ink-3">Sin fallos registrados este mes.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {fallidas.map((f) => (
                    <li key={f.id} className="px-5 py-3.5">
                      <p className="text-[14px] leading-snug text-ink">{f.texto}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-2" aria-hidden>
                          <span className="block h-full rounded-full bg-bad" style={{width: `${(f.fallos / f.respondidas) * 100}%`}} />
                        </span>
                        <span className="num shrink-0 font-mono text-[12.5px] text-bad">
                          {f.fallos} de {f.respondidas} fallaron
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[12.5px] text-ink-3">{f.topic}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </>
  );
}

function EmptyChart({text}: {text: string}) {
  return (
    <div className="grid h-40 place-items-center rounded-lg border border-dashed border-line px-6 text-center text-[14px] text-ink-3">
      <p>{text}</p>
    </div>
  );
}
