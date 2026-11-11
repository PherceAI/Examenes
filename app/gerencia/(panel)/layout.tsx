import {ManagerShell} from '@/components/manager-shell';
import {requireManager} from '@/lib/auth';
import {readDb} from '@/lib/db';
import {examWindow} from '@/lib/exam';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({children}: {children: React.ReactNode}) {
  await requireManager();
  const db = await readDb();
  const w = examWindow(db.ajustes);
  return (
    <ManagerShell windowLabel={w.label} windowOpen={w.open}>
      {children}
    </ManagerShell>
  );
}
