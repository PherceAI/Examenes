import Link from 'next/link';
import {ArrowUpRight, UserPlus} from 'lucide-react';
import {PageHeader, Panel} from '@/components/manager-shell';
import {MonthPicker} from '@/components/month-picker';
import {Avatar, btn, MonthStrip, StatusPill} from '@/components/ui';
import {AREAS} from '@/lib/areas';
import {readDb} from '@/lib/db';
import {examWindow, monthName, type MonthStatus} from '@/lib/exam';
import {punchMonths} from '@/lib/months';
import {availableMonths, monthRows, questionStats, topicStats} from '@/lib/stats';

const FILTERS: {id: 'todos' | MonthStatus; label: string}[] = [
  {id: 'todos', label: 'Todos'},
  {id: 'pendiente', label: 'Pendientes'},
  {id: 'en-curso', label: 'Sin terminar'},
  {id: 'reprobado', label: 'Reprobados'},
  {id: 'aprobado', label: 'Aprobados'},
  {id: 'sin-dato', label: 'No rindieron'},
];

export default async function Resumen({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const sp = await searchParams;
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : w.mes;
  const area = AREAS.some((a) => a.id === sp.area) ? sp.area : undefined;
  const estado = FILTERS.some((f) => f.id === sp.estado) ? (sp.estado as (typeof FILTERS)[number]['id']) : 'todos';

  const rows = monthRows(db, mes);
  const enviados = rows.filter((r) => r.attempt?.enviado);
  const promedio = enviados.length ? Math.round(enviados.reduce((n, r) => n + (r.attempt?.nota || 0), 0) / enviados.length) : null;
  const count = (s: MonthStatus) => rows.filter((r) => r.status === s).length;
  const temas = topicStats(rows);
  const fallidas = questionStats(rows).slice(0, 5);
  const visible = rows.filter((r) => (!area || r.emp.area === area) && (estado === 'todos' || r.status === estado));

  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {mes: mes === w.mes ? undefined : mes, area, estado: estado === 'todos' ? undefined : estado, ...patch};
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/gerencia?${s}` : '/gerencia';
  };

  const stats = [
    {label: 'Rindieron', value: enviados.length, of: rows.length},
    {label: 'Promedio', value: promedio ?? '—', of: 100},
    {label: 'Reprobados', value: count('reprobado'), tone: count('reprobado') ? 'text-bad' : ''},
    {label: 'Faltan', value: count('pendiente') + count('en-curso')},
  ];

  return (
    <>
      <PageHeader title={monthName(mes, true)} description={mes === w.mes ? `Examen: ${w.label.toLowerCase()}.` : 'Mes cerrado.'} actions={<MonthPicker months={availableMonths(db)} value={mes} />} />

      {/* Franja de cifras y avance por área */}
      <div className="grid grid-cols-2 border-b border-line lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`border-line px-5 py-6 lg:px-8 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''} lg:border-r lg:last:border-r-0`}>
            <p className="text-[14px] text-ink-3">{s.label}</p>
            <p className={`num mt-1.5 text-[40px] leading-none tracking-[-0.05em] text-ink ${s.tone || ''}`}>
              {s.value}
              {s.of !== undefined && <span className="ml-1 font-mono text-[14px] tracking-normal text-ink-3">/{s.of}</span>}
            </p>
          </div>
        ))}
      </div>
      <div className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-4">
        {AREAS.map((a, i) => {
          const ar = rows.filter((r) => r.emp.area === a.id);
          const done = ar.filter((r) => r.attempt?.enviado).length;
          const selected = area === a.id;
          return (
            <Link
              key={a.id}
              href={q({area: selected ? undefined : a.id})}
              aria-current={selected ? 'true' : undefined}
              className={`area-${a.id} group border-line px-5 py-4 transition-colors lg:px-8 ${i < 3 ? 'lg:border-r' : ''} ${i % 2 === 0 ? 'sm:border-r' : ''} ${i < 2 ? 'border-b lg:border-b-0' : i === 2 ? 'border-b sm:border-b-0' : ''} ${selected ? 'bg-subtle' : 'hover:bg-subtle'}`}
            >
              <div className="flex items-center justify-between text-[14px]">
                <span className="flex items-center gap-2 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[var(--area)]" aria-hidden />
                  {a.nombre}
                </span>
                <span className="num font-mono text-[13px] text-ink-3">
                  {done}/{ar.length}
                </span>
              </div>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-line-2" aria-hidden>
                <div className="h-full rounded-full bg-[var(--area)] transition-[width] duration-700" style={{width: ar.length ? `${(done / ar.length) * 100}%` : 0}} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-8 px-5 py-8 lg:px-8 xl:grid-cols-[1fr_340px]">
        <section aria-label="Empleados del mes" className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const n = f.id === 'todos' ? rows.length : count(f.id);
              if (f.id !== 'todos' && n === 0) return null;
              const on = estado === f.id;
              return (
                <Link
                  key={f.id}
                  href={q({estado: f.id === 'todos' ? undefined : f.id})}
                  aria-current={on ? 'true' : undefined}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13.5px] transition-colors ${on ? 'bg-ink text-white' : 'text-ink-2 hover:bg-subtle hover:text-ink'}`}
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
            <div className="frame mt-4"><div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line text-[13px] text-ink-3">
                    <th className="px-5 py-3 font-normal">Empleado</th>
                    <th className="px-3 py-3 font-normal">Estado</th>
                    <th className="px-3 py-3 font-normal">Últimos 12 meses</th>
                    <th className="w-10 px-3 py-3"><span className="sr-only">Abrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((r) => (
                    <tr key={r.emp.id} className="group transition-colors hover:bg-subtle">
                      <td className="px-5 py-3">
                        <Link href={`/gerencia/empleados/${r.emp.id}`} className="flex items-center gap-3">
                          <Avatar nombre={r.emp.nombre} area={r.emp.area} />
                          <span className="min-w-0">
                            <span className="block truncate text-ink">{r.emp.nombre}</span>
                            <span className="block truncate text-[13px] text-ink-3">{r.emp.puesto}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={r.status} nota={r.attempt?.enviado ? r.attempt.nota : undefined} />
                          {r.attempt && Object.keys(r.attempt.contradicciones).length > 0 && (
                            <span className="text-[12px] text-bad">Autoevaluación contradicha</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <MonthStrip months={punchMonths(db, r.emp, mes)} compact />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/gerencia/empleados/${r.emp.id}`} className="inline-grid h-8 w-8 place-items-center rounded-md text-ink-3 group-hover:text-ink" aria-label={`Abrir perfil de ${r.emp.nombre}`}>
                          <ArrowUpRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-ink-3">
                        Nadie en este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </div>
          )}
        </section>

        <aside className="space-y-8">
          <Panel title="Aciertos por tema">
            {temas.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-ink-3">Aparecen cuando alguien envía el examen.</p>
            ) : (
              <ul className="space-y-3.5 px-5 py-4">
                {temas.map((t) => {
                  const low = t.pct < db.ajustes.notaMinima;
                  return (
                    <li key={t.topicId}>
                      <div className="flex items-baseline justify-between gap-2 text-[14px]">
                        <span className="text-ink">{t.nombre}</span>
                        <span className={`num font-mono text-[13px] ${low ? 'text-bad' : 'text-ink-2'}`}>{t.pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line-2" aria-hidden>
                        <div className={`h-full rounded-full ${low ? 'bg-bad' : 'bg-ink'}`} style={{width: `${t.pct}%`}} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Preguntas más falladas">
            {fallidas.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-ink-3">Sin fallos registrados este mes.</p>
            ) : (
              <ol className="divide-y divide-line">
                {fallidas.map((f) => (
                  <li key={f.id} className="px-5 py-3.5">
                    <p className="text-[14px] leading-snug text-ink">{f.texto}</p>
                    <p className="mt-1.5 flex items-center justify-between gap-2 text-[12.5px] text-ink-3">
                      <span className="truncate">{f.topic}</span>
                      <span className="num shrink-0 font-mono text-bad">
                        {f.fallos}/{f.respondidas} fallaron
                      </span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
