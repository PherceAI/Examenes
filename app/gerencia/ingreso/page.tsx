import Link from 'next/link';
import {redirect} from 'next/navigation';
import {AuthLayout} from '@/components/auth-layout';
import {ManagerLogin} from '@/components/login-forms';
import {isManager} from '@/lib/auth';

export default async function IngresoGerencia() {
  if (await isManager()) redirect('/gerencia');
  return (
    <AuthLayout
      title={
        <>
          Panel de
          <br />
          Gerencia.
        </>
      }
      lead="Revisa quién rindió, qué temas se fallan y administra el banco de preguntas del personal."
      footer={
        <Link href="/" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
          Ir al ingreso de empleados
        </Link>
      }
    >
      <ManagerLogin />
    </AuthLayout>
  );
}
