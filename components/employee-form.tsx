'use client';

import {useActionState, useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {guardarEmpleado} from '@/app/actions';
import {AREAS} from '@/lib/areas';
import type {AreaId} from '@/lib/types';
import {btn, field, Notice} from './ui';
import {keepValues} from './keep-values';

export const inputCls = field;

export function EmployeeForm({
  initial,
}: {
  initial?: {id: string; nombre: string; cedula: string; area: AreaId; puesto: string};
}) {
  const [state, action, pending] = useActionState(guardarEmpleado, null);
  const [area, setArea] = useState<AreaId>(initial?.area || 'recepcion');
  const puestos = AREAS.find((a) => a.id === area)?.puestos || [];

  return (
    <form onSubmit={keepValues(action)} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="block space-y-1.5">
        <span className="text-[14px] font-medium text-ink">Nombre completo</span>
        <input name="nombre" defaultValue={initial?.nombre} required className={inputCls} placeholder="Nombres y apellidos" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[14px] font-medium text-ink">Cédula</span>
        <input name="cedula" defaultValue={initial?.cedula} inputMode="numeric" maxLength={10} required className={`${inputCls} num font-mono`} placeholder="10 dígitos" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-[14px] font-medium text-ink">Área</span>
          <select name="area" value={area} onChange={(e) => setArea(e.target.value as AreaId)} className={inputCls}>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[14px] font-medium text-ink">Puesto</span>
          <select name="puesto" key={area} defaultValue={initial?.area === area ? initial.puesto : puestos[0]} className={inputCls}>
            {puestos.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-[14px] font-medium text-ink">{initial ? 'Nuevo PIN (déjalo vacío para no cambiarlo)' : 'PIN de 4 dígitos'}</span>
        <input name="pin" inputMode="numeric" maxLength={4} required={!initial} className={`${inputCls} num font-mono tracking-[0.3em] placeholder:tracking-normal`} placeholder="0000" />
      </label>
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      {state?.ok && <Notice tone="ok">{state.ok}</Notice>}
      <button disabled={pending} className={`${btn.primary} h-11 text-[15px]`}>
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        {initial ? 'Guardar cambios' : 'Crear empleado'}
      </button>
    </form>
  );
}
