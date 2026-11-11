import {startTransition, type FormEvent} from 'react';

/** Envía el formulario a la acción sin que React lo vacíe: si hay un error, lo escrito se conserva. */
export function keepValues(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
