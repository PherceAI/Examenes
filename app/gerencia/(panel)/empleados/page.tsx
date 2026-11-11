import Link from 'next/link';
import {Search, UserPlus} from 'lucide-react';
import {PageHeader} from '@/components/manager-shell';
import {AreaDot, Avatar, btn, field, MonthStrip, StatusPill} from '@/components/ui';
import {AREAS, areaById} from '@/lib/areas';
import {readDb} from '@/lib/db';
import {attemptOf, examWindow, formatCedula, statusFor} from '@/lib/exam';
import {punchMonths} from '@/lib/months';

export default async function Empleados({searchParams}: {searchParams: Promise<{q?: string; area?: string}>}) {
  const {q = '', area} = await searchParams;
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const term = q.trim().toLowerCase();
  const list = db.empleados
    .filter((e) => (!area || e.area === area) && (!term || e.nombre.toLowerCase().includes(term) || e.cedula.includes(term)))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));
  const activos = db.empleados.filter((e) => e.activo).length;

  return (
    <>
      <PageHeader
        title="Empleados"
        description={`${activos} activos. Cada uno entra desde su teléfono con su cédula y un PIN de 4 dígitos.`}
        actions={
          <Link href="/gerencia/empleados/nuevo" className={`${btn.primary} h-10 text-[14px]`}>
            <UserPlus className="h-4 w-4" aria-hidden /> Agregar empleado
          </Link>
        }
      />
      <div className="px-5 py-8 lg:px-8">
        <form className="flex flex-wrap gap-2">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input name="q" defaultValue={q} placeholder="Buscar por nombre o cédula" className={`${field} h-10 py-0 pl-10 text-[14px]`} />
          </label>
          <select name="area" defaultValue={area || ''} className={`${field} h-10 w-auto py-0 text-[14px]`} aria-label="Área">
            <option value="">Todas las áreas</option>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <button className={`${btn.secondary} h-10 text-[14px]`}>Filtrar</button>
        </form>

        <div className="frame mt-5"><div className="relative overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-ink-3">
                <th className="px-5 py-3 font-normal">Empleado</th>
                <th className="px-3 py-3 font-normal">Cédula</th>
                <th className="px-3 py-3 font-normal">Área</th>
                <th className="px-3 py-3 font-normal">Este mes</th>
                <th className="px-5 py-3 font-normal">Últimos 12 meses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((e) => {
                const a = attemptOf(db, e.id, w.mes);
                return (
                  <tr key={e.id} className={`transition-colors hover:bg-subtle ${e.activo ? '' : 'opacity-55'}`}>
                    <td className="px-5 py-3">
                      <Link href={`/gerencia/empleados/${e.id}`} className="flex items-center gap-3">
                        <Avatar nombre={e.nombre} area={e.area} />
                        <span>
                          <span className="block text-ink hover:underline">{e.nombre}</span>
                          <span className="block text-[13px] text-ink-3">
                            {e.puesto}
                            {!e.activo && ' · Pausado'}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="num px-3 py-3 font-mono text-[13px] text-ink-2">{formatCedula(e.cedula)}</td>
                    <td className="px-3 py-3 text-ink-2">
                      <AreaDot area={e.area} /> <span className="ml-1">{areaById(e.area).nombre}</span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={statusFor(a, db.ajustes, true)} nota={a?.enviado ? a.nota : undefined} />
                    </td>
                    <td className="px-5 py-3">
                      <MonthStrip months={punchMonths(db, e)} compact />
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-ink-3">
                    {db.empleados.length === 0 ? 'Todavía no hay empleados cargados.' : 'Nadie coincide con la búsqueda.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}
