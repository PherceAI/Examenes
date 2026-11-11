import Link from 'next/link';
import {redirect} from 'next/navigation';
import {AuthLayout} from '@/components/auth-layout';
import {EmployeeLogin} from '@/components/login-forms';
import {currentEmployee} from '@/lib/auth';

export default async function Home() {
  if (await currentEmployee()) redirect('/empleado');
  return (
    <AuthLayout
      title={
        <>
          Tu evaluación
          <br />
          del mes.
        </>
      }
      lead="Ingresa con tu cédula y el PIN que te dio Gerencia. Son unos minutos y todo se guarda mientras respondes."
      footer={
        <>
          ¿Eres de Gerencia?{' '}
          <Link href="/gerencia/ingreso" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
            Entra al panel
          </Link>
        </>
      }
    >
      <EmployeeLogin />
    </AuthLayout>
  );
}
