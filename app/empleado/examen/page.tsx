import {redirect} from 'next/navigation';
import {ExamGame, type GameStep} from '@/components/exam-game';
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

  // Al cliente solo se le manda la respuesta correcta de las preguntas ya comprobadas (bloqueadas).
  const steps: GameStep[] = [
    ...a.preguntas.map((q) => {
      const elegida = a.respuestas[q.id];
      return {
        kind: 'pregunta' as const,
        id: q.id,
        seccion: q.topicNombre,
        tipo: q.tipo,
        texto: q.texto,
        opciones: q.opciones,
        hecho: elegida === undefined ? undefined : {elegida, correcta: q.correcta},
      };
    }),
    ...a.autoevalPreguntas.map((q) => ({
      kind: 'autoeval' as const,
      id: q.id,
      seccion: 'Sobre ti',
      tipo: 'sino' as const,
      texto: q.texto,
      opciones: ['Sí', 'No'],
      hecho: a.autoeval[q.id] === undefined ? undefined : {elegida: a.autoeval[q.id] ? 0 : 1},
    })),
  ];

  const companeros = db.empleados
    .filter((e) => e.activo && e.id !== emp.id && e.area === emp.area)
    .map((e) => ({id: e.id, nombre: e.nombre, puesto: e.puesto}))
    .sort((x, y) => x.nombre.localeCompare(y.nombre));

  return (
    <ExamGame
      mes={monthName(a.mes)}
      area={emp.area}
      steps={steps}
      companeros={companeros}
      initialVote={a.votoAmable}
    />
  );
}
