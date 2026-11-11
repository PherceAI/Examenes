'use client';

import {useState, useTransition} from 'react';
import {guardarPremio} from '@/app/actions';

export function AwardInput({
  mes,
  empleadoId,
  campo,
  initial,
  label,
  step = '1',
}: {
  mes: string;
  empleadoId: string;
  campo: 'vinos' | 'calificacionClientes';
  initial?: number;
  label: string;
  step?: string;
}) {
  const [value, setValue] = useState(initial === undefined ? '' : String(initial));
  const [saved, setSaved] = useState(value);
  const [pending, start] = useTransition();
  return (
    <input
      type="number"
      min={0}
      step={step}
      inputMode="decimal"
      aria-label={label}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value === saved) return;
        start(async () => {
          await guardarPremio(mes, empleadoId, campo, value);
          setSaved(value);
        });
      }}
      className={`num h-9 w-20 rounded-md border bg-paper px-2 text-right text-[14px] outline-none focus:border-accent ${
        pending ? 'border-wip' : value !== saved ? 'border-accent' : 'border-line'
      }`}
    />
  );
}
