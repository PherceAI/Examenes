import {LogOut} from 'lucide-react';
import {salir} from '@/app/actions';
import {btn, Wordmark} from './ui';

export function EmployeeHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-5">
        <Wordmark />
        <form action={salir}>
          <button className={`${btn.ghost} h-9 text-[14px]`}>
            <LogOut className="h-4 w-4" aria-hidden />
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
