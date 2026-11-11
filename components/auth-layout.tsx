import {Wordmark} from './ui';

/** Pantalla de ingreso: cuadrícula tenue arriba, titular grande y el formulario en un marco. */
export function AuthLayout({
  title,
  lead,
  children,
  footer,
}: {
  title: React.ReactNode;
  lead: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />
      <header className="relative border-b border-line bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-5">
          <Wordmark sub="Evaluaciones" />
        </div>
      </header>
      <main className="relative mx-auto grid max-w-5xl gap-10 px-5 pb-16 pt-10 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16">
        <div className="rise">
          <h1 className="text-[40px] leading-[1.02] font-normal tracking-[-0.05em] text-ink sm:text-[60px]">{title}</h1>
          <p className="mt-4 max-w-md text-[17px] leading-relaxed tracking-[-0.01em] text-ink-3 sm:text-[19px]">{lead}</p>
        </div>
        <div className="rise [animation-delay:80ms]">
          <section className="frame rounded-none p-6 sm:p-8">{children}</section>
          {footer && <div className="mt-6 text-center text-[14px] text-ink-3 lg:text-left">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
