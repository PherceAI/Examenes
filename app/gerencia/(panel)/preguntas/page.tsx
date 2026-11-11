import {PageHeader} from '@/components/manager-shell';
import {NewTopic, TopicBlock} from '@/components/question-editor';
import {ALL_PUESTOS} from '@/lib/areas';
import {MAX_PREGUNTAS_POR_TEMA} from '@/lib/banco';
import {readDb} from '@/lib/db';

export default async function Preguntas() {
  const db = await readDb();
  const temas = [...db.temas].sort((a, b) => a.orden - b.orden);
  const total = db.preguntas.filter((q) => q.activa).length;

  return (
    <>
      <PageHeader
        title="Banco de preguntas"
        description={
          <>
            <span className="num">{total}</span> preguntas en {temas.length} temas. Máximo {MAX_PREGUNTAS_POR_TEMA} por tema. Los cambios aplican a los exámenes que se empiecen después; uno ya empezado conserva sus preguntas.
          </>
        }
      />
      <div className="grid gap-8 px-5 py-8 lg:px-8 2xl:grid-cols-2">
        {temas.map((t) => (
          <TopicBlock
            key={t.id}
            topic={t}
            max={MAX_PREGUNTAS_POR_TEMA}
            puestos={ALL_PUESTOS}
            questions={db.preguntas.filter((q) => q.topicId === t.id && q.activa)}
          />
        ))}
        <div>
          <NewTopic puestos={ALL_PUESTOS} />
        </div>
      </div>
    </>
  );
}
