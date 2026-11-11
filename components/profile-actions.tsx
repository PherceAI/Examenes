'use client';

import {useState, useTransition} from 'react';
import {Flag, LoaderCircle, Pause, Play, RotateCcw} from 'lucide-react';
import {cambiarEstadoEmpleado, marcarContradiccion, reabrirIntento} from '@/app/actions';
import {btn} from './ui';

export function ToggleActive({id, activo}: {id: string; activo: boolean}) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => cambiarEstadoEmpleado(id, !activo))} className={`${btn.secondary} h-10 text-[14px]`}>
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : activo ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
      {activo ? 'Pausar usuario' : 'Reactivar usuario'}
    </button>
  );
}

export function ReopenAttempt({intentoId, mesLabel}: {intentoId: string; mesLabel: string}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm)
    return (
      <button type="button" onClick={() => setConfirm(true)} className={`${btn.ghost} h-8 text-[13px]`}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Permitir rendir de nuevo
      </button>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-[13px] text-bad">
      Se borra el examen de {mesLabel}.
      <button type="button" disabled={pending} onClick={() => start(() => reabrirIntento(intentoId))} className={`${btn.danger} h-8 text-[13px]`}>
        Borrar
      </button>
      <button type="button" onClick={() => setConfirm(false)} className={`${btn.ghost} h-8 text-[13px]`}>
        Cancelar
      </button>
    </span>
  );
}

export function ContradictionNote({intentoId, preguntaId, initial}: {intentoId: string; preguntaId: string; initial?: string}) {
  const [open, setOpen] = useState(Boolean(initial));
  const [text, setText] = useState(initial || '');
  const [saved, setSaved] = useState(initial || '');
  const [pending, start] = useTransition();

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-bad">
        <Flag className="h-3.5 w-3.5" aria-hidden /> Marcar como contradicha
      </button>
    );

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={300}
        placeholder="Ej.: los días 12 y 18 despachó sin comanda"
        className="h-9 flex-1 rounded-lg border border-line bg-paper px-3 text-[13.5px] outline-none focus:border-bad"
        aria-label="Nota de contradicción"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending || text === saved}
          onClick={() =>
            start(async () => {
              await marcarContradiccion(intentoId, preguntaId, text);
              setSaved(text);
              if (!text.trim()) setOpen(false);
            })
          }
          className={`${btn.danger} h-9 text-[13px] disabled:opacity-50`}
        >
          {text.trim() ? 'Guardar' : 'Quitar'}
        </button>
        {!saved && (
          <button type="button" onClick={() => setOpen(false)} className={`${btn.ghost} h-9 text-[13px]`}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
