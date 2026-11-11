'use client';

import {keepValues} from './keep-values';

import {useActionState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {guardarAjustes} from '@/app/actions';
import type {Settings} from '@/lib/types';
import {inputCls} from './employee-form';

const MODES: {id: Settings['ventana']; title: string; text: string}[] = [
  {id: 'auto', title: 'Automático', text: 'Se abre sola del 26 al 30 de cada mes (hora de Ecuador).'},
  {id: 'abierta', title: 'Abierto ahora', text: 'Abre el examen del mes ya, fuera de fecha. Útil para pruebas o recuperaciones.'},
  {id: 'cerrada', title: 'Cerrado', text: 'Nadie puede rendir, aunque sea entre el 26 y el 30.'},
];

export function SettingsForm({settings}: {settings: Settings}) {
  const [state, action, pending] = useActionState(guardarAjustes, null);
  return (
    <form onSubmit={keepValues(action)} className="space-y-6">
      <fieldset>
        <legend className="text-[15px] font-medium text-ink">Ventana del examen</legend>
        <div className="mt-3 grid gap-2.5">
          {MODES.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper px-4 py-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="radio" name="ventana" value={m.id} defaultChecked={settings.ventana === m.id} className="mt-1 h-4 w-4 accent-[#f0360a]" />
              <span>
                <span className="block text-[14px] font-medium text-ink">{m.title}</span>
                <span className="block text-[13px] text-ink-2">{m.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block max-w-[220px] space-y-1.5">
        <span className="text-[15px] font-medium text-ink">Nota mínima para aprobar</span>
        <input name="notaMinima" type="number" min={1} max={100} defaultValue={settings.notaMinima} className={`${inputCls} num`} />
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-[14px] font-medium text-bad">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-lg bg-ok-soft px-3.5 py-2.5 text-[14px] font-medium text-ok">{state.ok}</p>}
      <button disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[14px] font-medium text-white hover:bg-accent-strong disabled:opacity-70">
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        Guardar ajustes
      </button>
    </form>
  );
}
