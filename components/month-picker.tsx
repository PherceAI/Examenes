'use client';

import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {monthName} from '@/lib/exam';

export function MonthPicker({months, value}: {months: string[]; value: string}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Mes</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          p.set('mes', e.target.value);
          router.push(`${path}?${p.toString()}`);
        }}
        className="h-10 appearance-none rounded-lg border border-line bg-paper pl-3.5 pr-9 text-[14px] text-ink shadow-[var(--shadow-soft)] outline-none hover:bg-subtle focus:border-accent"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthName(m, true).replace(/^./, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 h-4 w-4 text-ink-3" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
