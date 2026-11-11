import Link from 'next/link';
import {Download, Heart, Star, Wine} from 'lucide-react';
import {AwardInput} from '@/components/award-input';
import {Avatar, btn, StatusPill} from '@/components/ui';
import {PageHeader} from '@/components/manager-shell';
import {MonthPicker} from '@/components/month-picker';
import {readDb} from '@/lib/db';
import {examWindow, monthName} from '@/lib/exam';
import {availableMonths, monthRows} from '@/lib/stats';

export default async function Resultados({searchParams}: {searchParams: Promise<{mes?: string}>}) {
  const sp = await searchParams;
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : w.mes;
  const rows = monthRows(db, mes);
  const temas = [...db.temas].sort((a, b) => a.orden - b.orden);
  const premios = db.premios.filter((p) => p.mes === mes);
  const premio = (id: string) => premios.find((p) => p.empleadoId === id);

  const votos = new Map<string, number>();
  for (const r of rows) {
    const v = r.attempt?.enviado ? r.attempt.votoAmable : undefined;
    if (v) votos.set(v, (votos.get(v) || 0) + 1);
  }
  const nombre = (id: string) => db.empleados.find((e) => e.id === id)?.nombre || '—';
  const topVoto = [...votos.entries()].sort((a, b) => b[1] - a[1])[0];
  const topVinos = [...premios].filter((p) => p.vinos).sort((a, b) => (b.vinos || 0) - (a.vinos || 0))[0];
  const topCalif = [...premios].filter((p) => p.calificacionClientes).sort((a, b) => (b.calificacionClientes || 0) - (a.calificacionClientes || 0))[0];

  return (
    <>
      <PageHeader
        title="Resultados"
        description={<>Nota por tema, autoevaluación, votos del equipo y premios de <span className="text-ink">{monthName(mes, true)}</span>.</>}
        actions={
          <>
            <MonthPicker months={availableMonths(db)} value={mes} />
            <a href={`/gerencia/exportar?mes=${mes}`} className={`${btn.secondary} h-10 text-[14px]`}>
              <Download className="h-4 w-4" aria-hidden /> Excel (CSV)
            </a>
          </>
        }
      />

      <div className="space-y-8 px-5 py-8 lg:px-8">
        <section className="frame grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0" aria-label="Reconocimientos del mes">
          <Leader icon={<Heart className="h-4 w-4" aria-hidden />} title="El más amable" who={topVoto ? nombre(topVoto[0]) : null} detail={topVoto ? `${topVoto[1]} ${topVoto[1] === 1 ? 'voto' : 'votos'} del equipo` : 'Sin votos todavía'} />
          <Leader icon={<Wine className="h-4 w-4" aria-hidden />} title="Más vinos vendidos" who={topVinos ? nombre(topVinos.empleadoId) : null} detail={topVinos ? `${topVinos.vinos} botellas` : 'Cárgalo en la tabla'} />
          <Leader icon={<Star className="h-4 w-4" aria-hidden />} title="Mejor calificación de clientes" who={topCalif ? nombre(topCalif.empleadoId) : null} detail={topCalif ? `${topCalif.calificacionClientes} de 5` : 'Cárgalo en la tabla'} />
        </section>

        <div className="frame"><div className="relative overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-[13px]">
            <thead className="border-b border-line text-[12.5px] text-ink-3">
              <tr>
                <th className="sticky left-0 bg-paper px-5 py-3 font-normal">Empleado</th>
                <th className="px-3 py-3 font-normal">Nota</th>
                {temas.map((t) => (
                  <th key={t.id} className="max-w-[110px] px-3 py-3 font-normal leading-tight">
                    {t.nombre}
                  </th>
                ))}
                <th className="px-3 py-3 font-normal">Autoeval.</th>
                <th className="px-3 py-3 font-normal">Votos</th>
                <th className="px-3 py-3 text-right font-normal">Vinos</th>
                <th className="px-3 py-3 text-right font-normal">Calif. clientes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const a = r.attempt?.enviado ? r.attempt : undefined;
                const contr = r.attempt ? Object.keys(r.attempt.contradicciones).length : 0;
                return (
                  <tr key={r.emp.id} className="group hover:bg-subtle">
                    <td className="sticky left-0 bg-paper px-5 py-2.5 group-hover:bg-subtle">
                      <Link href={`/gerencia/empleados/${r.emp.id}?mes=${mes}`} className="flex items-center gap-2.5 text-[14px] text-ink hover:underline">
                        <Avatar nombre={r.emp.nombre} area={r.emp.area} size={28} />
                        {r.emp.nombre}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={r.status} nota={a?.nota} />
                    </td>
                    {temas.map((t) => {
                      const s = a?.porTema?.find((x) => x.topicId === t.id);
                      if (!s) return <td key={t.id} className="px-3 py-2.5 text-ink-3">—</td>;
                      const low = s.aciertos / s.total < db.ajustes.notaMinima / 100;
                      return (
                        <td key={t.id} className={`num px-3 py-2.5 font-mono ${low ? 'text-bad' : 'text-ink'}`}>
                          {s.aciertos}/{s.total}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5">
                      {contr > 0 ? <span className="font-medium text-bad">{contr} contradicha{contr > 1 ? 's' : ''}</span> : <span className="text-ink-3">{r.attempt ? 'Sin notas' : '—'}</span>}
                    </td>
                    <td className="num px-3 py-2.5 font-medium text-ink">{votos.get(r.emp.id) || <span className="font-normal text-ink-3">0</span>}</td>
                    <td className="px-3 py-1.5 text-right">
                      <AwardInput key={`v-${mes}-${r.emp.id}`} mes={mes} empleadoId={r.emp.id} campo="vinos" initial={premio(r.emp.id)?.vinos} label={`Vinos vendidos por ${r.emp.nombre}`} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <AwardInput key={`c-${mes}-${r.emp.id}`} mes={mes} empleadoId={r.emp.id} campo="calificacionClientes" step="0.1" initial={premio(r.emp.id)?.calificacionClientes} label={`Calificación de clientes de ${r.emp.nombre}`} />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={temas.length + 6} className="px-4 py-10 text-center text-ink-2">
                    No hay empleados en este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
        <p className="text-[13px] text-ink-2">Los vinos y la calificación de clientes se guardan al salir de cada casilla.</p>
      </div>
    </>
  );
}

function Leader({icon, title, who, detail}: {icon: React.ReactNode; title: string; who: string | null; detail: string}) {
  return (
    <div className="px-5 py-5">
      <p className="flex items-center gap-2 text-[13.5px] text-ink-3">
        <span className="text-accent">{icon}</span>
        {title}
      </p>
      <p className={`mt-2 text-[22px] leading-tight tracking-[-0.035em] ${who ? 'text-ink' : 'text-ink-3'}`}>{who || 'Nadie todavía'}</p>
      <p className="num mt-1 text-[13.5px] text-ink-3">{detail}</p>
    </div>
  );
}
