import Link from 'next/link';
import {redirect} from 'next/navigation';
import {Check, Flame, Star, Target, Trophy, X, Zap} from 'lucide-react';
import {EmployeeHeader} from '@/components/employee-header';
import {requireEmployee} from '@/lib/auth';
import {readDb} from '@/lib/db';
import {attemptOf, examWindow, monthName} from '@/lib/exam';
import {gameStats, monthlyStreak, stars} from '@/lib/game';

export const dynamic = 'force-dynamic';

const CONFETI = ['#f0360a', '#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6'];

export default async function ResultadoPage({searchParams}: {searchParams: Promise<{fin?: string}>}) {
  const {fin} = await searchParams;
  const emp = await requireEmployee();
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const current = attemptOf(db, emp.id, w.mes);
  const a = current?.enviado
    ? current
    : db.intentos.filter((i) => i.empleadoId === emp.id && i.enviado).sort((x, y) => y.mes.localeCompare(x.mes))[0];
  if (!a?.enviado || typeof a.nota !== 'number') redirect('/empleado');
  const min = db.ajustes.notaMinima;
  const aprobado = a.nota >= min;
  const g = gameStats(a);
  const racha = monthlyStreak(db, emp.id, a.mes);
  const errores = a.preguntas.filter((q) => a.respuestas[q.id] !== q.correcta);
  const celebrar = fin === '1';
  const firstName = emp.nombre.split(' ')[0];

  const titulo = a.nota === 100 ? '¡Perfecto!' : aprobado ? `¡Bien hecho, ${firstName}!` : `Lo terminaste, ${firstName}.`;
  const sub = aprobado
    ? `Aprobaste el examen de ${monthName(a.mes)} con ${a.nota} de 100.`
    : `Sacaste ${a.nota} de 100 y la mínima es ${min}. Repasa lo de abajo: el próximo mes te irá mejor.`;

  return (
    <>
      <EmployeeHeader />
      <main className="relative mx-auto max-w-xl overflow-hidden px-5 pb-16 pt-8">
        {celebrar && aprobado && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px]" aria-hidden>
            {Array.from({length: 28}, (_, i) => (
              <span
                key={i}
                className="confetti"
                style={
                  {
                    left: `${(i * 37) % 100}%`,
                    background: CONFETI[i % CONFETI.length],
                    animationDelay: `${(i % 7) * 70}ms`,
                    '--dx': `${((i * 53) % 120) - 60}px`,
                    '--rot': `${((i * 97) % 720) - 360}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}

        <section className="pop-in relative text-center">
          <span
            className={`mx-auto grid h-24 w-24 place-items-center rounded-full border-2 border-b-[6px] text-white ${
              aprobado ? 'border-[#11803a] bg-[#16a34a]' : 'border-[#b52805] bg-accent'
            }`}
            aria-hidden
          >
            {aprobado ? <Trophy className="h-11 w-11" /> : <Target className="h-11 w-11" />}
          </span>
          <h1 className="mt-5 text-[32px] leading-tight font-semibold tracking-[-0.04em] text-ink text-balance">{titulo}</h1>
          <p className="mx-auto mt-2 max-w-sm text-[16px] leading-relaxed text-ink-2">{sub}</p>
        </section>

        {/* Cuatro cifras del juego */}
        <dl className="mt-8 grid grid-cols-2 gap-3">
          <Stat icon={<Target className="h-5 w-5" aria-hidden />} tone="text-accent" label="Nota" value={`${a.nota}`} unit="/100" delay={80} />
          <Stat icon={<Check className="h-5 w-5" strokeWidth={3} aria-hidden />} tone="text-ok" label="Aciertos" value={`${g.aciertos}`} unit={`/${g.total}`} delay={160} />
          <Stat icon={<Zap className="h-5 w-5 fill-current" aria-hidden />} tone="text-[#ca8a04]" label="Puntos" value={`${g.puntos}`} delay={240} />
          <Stat icon={<Flame className="h-5 w-5 fill-current" aria-hidden />} tone="text-accent" label="Mejor racha" value={`${g.mejorRacha}`} unit=" seguidas" delay={320} />
        </dl>

        {racha >= 1 && (
          <p className="pop-in mt-3 flex items-center justify-center gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-[15px] text-accent-strong [animation-delay:400ms]">
            <Flame className="h-5 w-5 shrink-0 fill-accent/30" aria-hidden />
            {racha === 1 ? 'Primer mes completado. ¡Vuelve el próximo mes para empezar tu racha!' : `Llevas ${racha} meses seguidos completando tu examen.`}
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">Tus temas</h2>
          <ul className="mt-3 space-y-2">
            {(a.porTema || []).map((t, k) => {
              const s = stars(t.aciertos, t.total);
              return (
                <li key={t.topicId} className="tile flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-ink">{t.nombre}</span>
                    <span className="num block text-[13px] text-ink-3">
                      {t.aciertos} de {t.total} correctas
                    </span>
                  </span>
                  <span className="flex gap-0.5" aria-label={`${s} de 3 estrellas`}>
                    {[0, 1, 2].map((n) => (
                      <Star
                        key={n}
                        className={`star-in h-6 w-6 ${n < s ? 'fill-[#facc15] text-[#eab308]' : 'fill-line-2 text-line'}`}
                        style={{animationDelay: `${500 + k * 90 + n * 70}ms`}}
                        aria-hidden
                      />
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {errores.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">Para repasar</h2>
            <p className="mt-1 text-[15px] text-ink-3">
              {errores.length} {errores.length === 1 ? 'pregunta' : 'preguntas'} con la respuesta correcta.
            </p>
            <ul className="mt-4 space-y-3">
              {errores.map((q) => (
                <li key={q.id} className="rounded-2xl border-2 border-line p-4">
                  <p className="text-[13px] text-ink-3">{q.topicNombre}</p>
                  <p className="mt-1 text-[16px] leading-snug font-medium text-ink">{q.texto}</p>
                  <div className="mt-3 space-y-2 text-[15px]">
                    <p className="flex items-start gap-2.5 rounded-xl bg-bad-soft px-3 py-2 text-bad">
                      <X className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
                      <span>
                        <span className="sr-only">Tu respuesta: </span>
                        {q.opciones[a.respuestas[q.id]] ?? 'Sin respuesta'}
                      </span>
                    </p>
                    <p className="flex items-start gap-2.5 rounded-xl bg-ok-soft px-3 py-2 text-ok">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
                      <span>
                        <span className="sr-only">Respuesta correcta: </span>
                        {q.opciones[q.correcta]}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-10 rounded-2xl bg-ok-soft px-4 py-3 text-center text-[15px] text-ok">Respondiste todo correctamente.</p>
        )}

        <Link href="/empleado" className="btn-game btn-game-ink mt-10 w-full">
          Volver al inicio
        </Link>
      </main>
    </>
  );
}

function Stat({icon, tone, label, value, unit, delay}: {icon: React.ReactNode; tone: string; label: string; value: string; unit?: string; delay: number}) {
  return (
    <div className="count-up tile px-4 py-3.5" style={{animationDelay: `${delay}ms`}}>
      <dt className={`flex items-center gap-1.5 text-[13px] font-medium ${tone}`}>
        {icon}
        {label}
      </dt>
      <dd className="num mt-1 text-[28px] leading-none font-semibold tracking-[-0.03em] text-ink">
        {value}
        {unit && <span className="text-[14px] font-normal tracking-normal text-ink-3">{unit}</span>}
      </dd>
    </div>
  );
}
