'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BarChart3, LayoutDashboard, ListChecks, LogOut, Settings, Users} from 'lucide-react';
import {salir} from '@/app/actions';
import {btn, Wordmark} from './ui';

const NAV = [
  {href: '/gerencia', label: 'Resumen', icon: LayoutDashboard},
  {href: '/gerencia/empleados', label: 'Empleados', icon: Users},
  {href: '/gerencia/preguntas', label: 'Preguntas', icon: ListChecks},
  {href: '/gerencia/resultados', label: 'Resultados', icon: BarChart3},
  {href: '/gerencia/ajustes', label: 'Ajustes', icon: Settings},
];

export function ManagerShell({windowLabel, windowOpen, children}: {windowLabel: string; windowOpen: boolean; children: React.ReactNode}) {
  const path = usePathname();
  const active = (href: string) => (href === '/gerencia' ? path === href : path.startsWith(href));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-4 md:h-16 lg:px-8">
          <Link href="/gerencia" aria-label="Inicio del panel">
            <Wordmark sub="Gerencia" />
          </Link>
          <nav className="hidden h-full items-stretch gap-1 md:flex" aria-label="Secciones">
            {NAV.map(({href, label}) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? 'page' : undefined}
                className={`relative flex items-center px-3 text-[14px] transition-colors ${
                  active(href) ? 'text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:bg-accent' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1 text-[13px] text-ink-2 shadow-[var(--shadow-soft)]" title={windowLabel}>
              <span className={`h-1.5 w-1.5 rounded-full ${windowOpen ? 'live-dot bg-accent' : 'bg-[#d4d4d4]'}`} aria-hidden />
              <span className="lg:hidden">{windowOpen ? 'Examen abierto' : 'Examen cerrado'}</span>
              <span className="hidden lg:inline">{windowLabel}</span>
            </span>
            <form action={salir}>
              <button className={`${btn.ghost} h-9 text-[14px]`} aria-label="Salir">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl border-line pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0 xl:border-x">{children}</div>

      {/* En el teléfono: barra de pestañas fija abajo, al alcance del pulgar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Secciones"
      >
        {NAV.map(({href, label, icon: Icon}) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={`relative flex h-[64px] flex-col items-center justify-center gap-1 text-[11.5px] font-medium transition-colors ${on ? 'text-accent' : 'text-ink-3 active:text-ink'}`}
            >
              {on && <span className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-accent" aria-hidden />}
              <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.25 : 1.75} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({title, description, actions}: {title: string; description?: React.ReactNode; actions?: React.ReactNode}) {
  return (
    <div className="relative overflow-hidden border-b border-line">
      <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex flex-col gap-5 px-5 pb-8 pt-10 sm:flex-row sm:items-end sm:justify-between lg:px-8 lg:pt-14">
        <div className="min-w-0">
          <h1 className="text-[34px] leading-[1.05] tracking-[-0.05em] text-ink first-letter:uppercase sm:text-[44px]">{title}</h1>
          {description && <div className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-3">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Bloque con borde fino y marcas de esquina, con encabezado opcional. */
export function Panel({title, aside, children, className = ''}: {title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string}) {
  return (
    <section className={`frame ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-medium text-ink">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
