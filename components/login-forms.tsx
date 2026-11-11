'use client';

import {useActionState} from 'react';
import {ArrowRight, LoaderCircle} from 'lucide-react';
import {loginEmpleado, loginGerencia} from '@/app/actions';
import {btn, field, Notice} from './ui';
import {keepValues} from './keep-values';

function Submit({pending, children}: {pending: boolean; children: React.ReactNode}) {
  return (
    <button type="submit" disabled={pending} className={`${btn.primary} h-12 w-full text-[16px]`}>
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
      {!pending && <ArrowRight className="h-4 w-4" aria-hidden />}
    </button>
  );
}

export function EmployeeLogin() {
  const [state, action, pending] = useActionState(loginEmpleado, null);
  return (
    <form onSubmit={keepValues(action)} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-[14px] font-medium text-ink">Cédula</span>
        <input key={state?.cedula ?? ''} defaultValue={state?.cedula} name="cedula" inputMode="numeric" autoComplete="username" maxLength={10} placeholder="0601234567" required className={`${field} num h-12 font-mono text-[16px]`} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[14px] font-medium text-ink">PIN</span>
        <input
          name="pin"
          autoFocus={Boolean(state?.cedula)}
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          placeholder="4 dígitos"
          required
          className={`${field} num h-12 font-mono text-[16px] tracking-[0.4em] placeholder:font-sans placeholder:tracking-normal`}
        />
      </label>
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      <div className="pt-1">
        <Submit pending={pending}>Entrar</Submit>
      </div>
    </form>
  );
}

export function ManagerLogin() {
  const [state, action, pending] = useActionState(loginGerencia, null);
  return (
    <form onSubmit={keepValues(action)} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-[14px] font-medium text-ink">Clave de Gerencia</span>
        <input name="clave" type="password" autoComplete="current-password" required className={`${field} h-12`} />
      </label>
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      <div className="pt-1">
        <Submit pending={pending}>Entrar al panel</Submit>
      </div>
    </form>
  );
}
