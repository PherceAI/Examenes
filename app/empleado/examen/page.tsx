import {redirect} from 'next/navigation';
import {ExamRunner, type RunnerStep} from '@/components/exam-runner';
import {requireEmployee} from '@/lib/auth';
import {readDb} from '@/lib/db';
import {attemptOf, examWindow, monthName} from '@/lib/exam';

export const dynamic = 'force-dynamic';

export default async function ExamenPage() {
  const emp = await requireEmployee();
  const db = await readDb();
  const w = examWindow(db.ajustes);
  const a = attemptOf(db, emp.id, w.mes);
  if (!a) redirect('/empleado');
  if (a.enviado) redirect('/empleado/resultado');
  if (!w.open) redirect('/empleado');

  // Al cliente nunca se le envía cuál es la respuesta correcta.
  const steps: RunnerStep[] = [
    ...a.preguntas.map((q) => ({
      kind: 'pregunta' as const,
      id: q.id,
      seccion: q.topicNombre,
      texto: q.texto,
      opciones: q.opciones,
    })),
    ...a.autoevalPreguntas.map((q) => ({
      kind: 'autoeval' as const,
      id: q.id,
      seccion: 'Autoevaluación',
      texto: q.texto,
      opciones: ['Sí', 'No'],
    })),
  ];

  const companeros = db.empleados
    .filter((e) => e.activo && e.id !== emp.id && e.area === emp.area)
    .map((e) => ({id: e.id, nombre: e.nombre, puesto: e.puesto}))
    .sort((x, y) => x.nombre.localeCompare(y.nombre));

  const initial: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.respuestas)) initial[`pregunta:${k}`] = v;
  for (const [k, v] of Object.entries(a.autoeval)) initial[`autoeval:${k}`] = v ? 0 : 1;

  return (
    <ExamRunner
      mes={monthName(a.mes)}
      area={emp.area}
      steps={steps}
      companeros={companeros}
      initialAnswers={initial}
      initialVote={a.votoAmable}
    />
  );
}
