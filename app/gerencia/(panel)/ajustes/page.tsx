import {PageHeader} from '@/components/manager-shell';
import {SettingsForm} from '@/components/settings-form';
import {readDb} from '@/lib/db';

export default async function Ajustes() {
  const db = await readDb();
  return (
    <>
      <PageHeader title="Ajustes" description="Cuándo se abre el examen y con qué nota se aprueba." />
      <div className="px-5 py-8 lg:px-8">
        <section className="max-w-xl frame p-6 sm:p-8">
          <SettingsForm settings={db.ajustes} />
        </section>
      </div>
    </>
  );
}
