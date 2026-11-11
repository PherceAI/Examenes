'use client';

import {keepValues} from './keep-values';

import {useActionState, useEffect, useState, useTransition} from 'react';
import {Check, LoaderCircle, Pencil, Plus, Trash2, X} from 'lucide-react';
import {eliminarPregunta, eliminarTema, guardarPregunta, guardarTema} from '@/app/actions';
import type {Question, QuestionType, Topic} from '@/lib/types';
import {inputCls} from './employee-form';

/** Formulario de una pregunta: tipo, texto, opciones y cuál es la correcta. */
export function QuestionForm({topicId, question, onDone}: {topicId: string; question?: Question; onDone: () => void}) {
  const [state, action, pending] = useActionState(guardarPregunta, null);
  const [tipo, setTipo] = useState<QuestionType>(question?.tipo || 'multiple');
  const [opciones, setOpciones] = useState<string[]>(question?.tipo === 'multiple' ? question.opciones : ['', '', '']);
  const [correcta, setCorrecta] = useState<number>(question?.correcta ?? 0);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const shown = tipo === 'sino' ? ['Sí', 'No'] : opciones;

  return (
    <form onSubmit={keepValues(action)} className="space-y-4 rounded-lg border border-line bg-subtle p-4">
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="correcta" value={correcta} />

      <div className="inline-flex rounded-lg bg-paper p-1 ring-1 ring-inset ring-line" role="radiogroup" aria-label="Tipo de pregunta">
        {(['multiple', 'sino'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => {
              setTipo(t);
              setCorrecta(0);
            }}
            className={`h-8 rounded-md px-3 text-[13px] font-medium ${tipo === t ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink'}`}
          >
            {t === 'multiple' ? 'Opción múltiple' : 'Sí / No'}
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-ink-2">Pregunta</span>
        <textarea name="texto" defaultValue={question?.texto} required rows={2} className={`${inputCls} resize-y`} />
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-[13px] font-medium text-ink-2">Opciones · toca el círculo de la correcta</legend>
        {shown.map((op, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCorrecta(i)}
              aria-label={`Marcar opción ${i + 1} como correcta`}
              aria-pressed={correcta === i}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${correcta === i ? 'border-ok bg-ok text-white' : 'border-line bg-paper text-transparent hover:border-ok'}`}
            >
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            </button>
            {tipo === 'sino' ? (
              <span className="text-[15px] font-medium text-ink">{op}</span>
            ) : (
              <>
                <input
                  name="opcion"
                  value={op}
                  onChange={(e) => setOpciones((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                  className={inputCls}
                />
                {opciones.length > 2 && (
                  <button
                    type="button"
                    aria-label="Quitar opción"
                    onClick={() => {
                      setOpciones((o) => o.filter((_, j) => j !== i));
                      setCorrecta((c) => (c === i ? 0 : c > i ? c - 1 : c));
                    }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-subtle hover:text-bad"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        {tipo === 'multiple' && opciones.length < 5 && (
          <button type="button" onClick={() => setOpciones((o) => [...o, ''])} className="ml-10 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar opción
          </button>
        )}
      </fieldset>

      {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-[14px] font-medium text-bad">{state.error}</p>}

      <div className="flex gap-2">
        <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[14px] font-medium text-white hover:bg-accent-strong disabled:opacity-70">
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Guardar pregunta
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-lg px-3 text-[14px] font-medium text-ink-2 hover:bg-subtle">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function TopicBlock({topic, questions, max, puestos}: {topic: Topic; questions: Question[]; max: number; puestos: string[]}) {
  const [editing, setEditing] = useState<string | null>(null); // id de pregunta, 'nueva' o 'tema'
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const full = questions.length >= max;

  return (
    <section className="frame">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[16px] font-medium text-ink">{topic.nombre}</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {topic.puestos.length === 0 ? 'Lo rinden todos' : `Solo ${topic.puestos.join(', ')}`} ·{' '}
            <span className={`num font-medium ${full ? 'text-ink' : 'text-ink-2'}`}>
              {questions.length} de {max} preguntas
            </span>
          </p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setEditing(editing === 'tema' ? null : 'tema')} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 hover:bg-subtle">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Tema
          </button>
          <button
            type="button"
            disabled={full}
            title={full ? `Máximo ${max} preguntas por tema` : undefined}
            onClick={() => setEditing('nueva')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white hover:bg-accent-strong disabled:bg-line disabled:text-ink-3"
          >
            <Plus className="h-4 w-4" aria-hidden /> Pregunta
          </button>
        </div>
      </header>

      {editing === 'tema' && (
        <div className="border-b border-line px-5 py-4">
          <TopicForm topic={topic} puestos={puestos} onDone={() => setEditing(null)} />
        </div>
      )}

      <ol className="divide-y divide-line">
        {questions.map((q, n) =>
          editing === q.id ? (
            <li key={q.id} className="px-5 py-4">
              <QuestionForm topicId={topic.id} question={q} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={q.id} className="group flex gap-3 px-5 py-3.5">
              <span className="num w-5 shrink-0 pt-0.5 text-[13px] font-medium text-ink-3">{n + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-snug text-ink">{q.texto}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {q.opciones.map((op, i) => (
                    <li
                      key={i}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] ${i === q.correcta ? 'bg-ok-soft font-medium text-ok' : 'bg-subtle text-ink-2'}`}
                    >
                      {i === q.correcta && <Check className="h-3 w-3" strokeWidth={3} aria-label="Correcta" />}
                      {op}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {confirmDelete === q.id ? (
                  <span className="flex items-center gap-1 text-[12px]">
                    <button type="button" disabled={pending} onClick={() => start(() => eliminarPregunta(q.id))} className="h-8 rounded-md bg-bad px-2.5 font-medium text-white">
                      Quitar
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="h-8 rounded-md px-2 font-medium text-ink-2">
                      No
                    </button>
                  </span>
                ) : (
                  <>
                    <button type="button" aria-label="Editar pregunta" onClick={() => setEditing(q.id)} className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-subtle hover:text-ink">
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" aria-label="Quitar pregunta" onClick={() => setConfirmDelete(q.id)} className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        )}
        {questions.length === 0 && editing !== 'nueva' && <li className="px-5 py-6 text-[14px] text-ink-2">Este tema todavía no tiene preguntas.</li>}
        {editing === 'nueva' && (
          <li className="px-5 py-4">
            <QuestionForm topicId={topic.id} onDone={() => setEditing(null)} />
          </li>
        )}
      </ol>
    </section>
  );
}

export function TopicForm({topic, puestos, onDone}: {topic?: Topic; puestos: string[]; onDone: () => void}) {
  const [state, action, pending] = useActionState(guardarTema, null);
  const [deleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={keepValues(action)} className="space-y-4">
      {topic && <input type="hidden" name="id" value={topic.id} />}
      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-ink-2">Nombre del tema</span>
        <input name="nombre" defaultValue={topic?.nombre} required className={inputCls} />
      </label>
      <fieldset>
        <legend className="text-[13px] font-medium text-ink-2">¿Quién lo rinde? Sin marcar ninguno, lo rinden todos.</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {puestos.map((p) => (
            <label key={p} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-paper px-3 py-1.5 text-[13px] ring-1 ring-inset ring-line has-[:checked]:bg-ink has-[:checked]:text-white has-[:checked]:ring-ink">
              <input type="checkbox" name="puesto" value={p} defaultChecked={topic?.puestos.includes(p)} className="sr-only" />
              {p}
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-[14px] font-medium text-bad">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[14px] font-medium text-white hover:bg-accent-strong disabled:opacity-70">
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {topic ? 'Guardar tema' : 'Crear tema'}
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-lg px-3 text-[14px] font-medium text-ink-2 hover:bg-subtle">
          Cancelar
        </button>
        {topic && (
          <span className="ml-auto">
            {confirm ? (
              <span className="flex items-center gap-2 text-[13px] text-bad">
                Se borran el tema y sus preguntas.
                <button type="button" disabled={deleting} onClick={() => startDelete(() => eliminarTema(topic.id))} className="h-9 rounded-md bg-bad px-3 font-medium text-white">
                  Borrar
                </button>
                <button type="button" onClick={() => setConfirm(false)} className="h-9 px-2 font-medium text-ink-2">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-bad hover:bg-bad-soft">
                <Trash2 className="h-4 w-4" aria-hidden /> Borrar tema
              </button>
            )}
          </span>
        )}
      </div>
    </form>
  );
}

export function NewTopic({puestos}: {puestos: string[]}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-paper px-4 text-[14px] font-medium text-ink ring-1 ring-inset ring-line hover:bg-subtle">
        <Plus className="h-4 w-4" aria-hidden /> Nuevo tema
      </button>
    );
  return (
    <section className="frame p-5">
      <h2 className="mb-4 text-[16px] font-medium text-ink">Nuevo tema</h2>
      <TopicForm puestos={puestos} onDone={() => setOpen(false)} />
    </section>
  );
}
