import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {EmployeeForm} from '@/components/employee-form';
import {PageHeader} from '@/components/manager-shell';

export default function NuevoEmpleado() {
  return (
    <>
      <PageHeader
        title="Agregar empleado"
        description={
          <Link href="/gerencia/empleados" className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Volver a empleados
          </Link>
        }
      />
      <div className="px-5 py-8 lg:px-8">
        <div className="grid max-w-4xl gap-8 lg:grid-cols-[1fr_260px]">
          <section className="frame p-6 sm:p-8">
            <EmployeeForm />
          </section>
          <p className="text-[14px] leading-relaxed text-ink-3">
            Al terminar, entrégale al empleado su cédula y el PIN. Con eso entra desde su teléfono al enlace de evaluaciones. Si lo olvida, aquí mismo le asignas uno nuevo.
          </p>
        </div>
      </div>
    </>
  );
}
