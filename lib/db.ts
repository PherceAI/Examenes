import {promises as fs} from 'fs';
import path from 'path';
import {AUTOEVAL_INICIAL, PREGUNTAS_INICIALES, TEMAS_INICIALES} from './banco';
import type {Database} from './types';

// Base de datos en un solo archivo JSON dentro del volumen persistente (/data en Coolify).
// Una cola en memoria serializa las escrituras; se escribe a un temporal y se renombra.

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data-local');
const FILE = path.join(DATA_DIR, 'evaluaciones.json');

function emptyDb(): Database {
  return {
    version: 1,
    empleados: [],
    temas: structuredClone(TEMAS_INICIALES),
    preguntas: structuredClone(PREGUNTAS_INICIALES),
    autoeval: structuredClone(AUTOEVAL_INICIAL),
    intentos: [],
    premios: [],
    ajustes: {notaMinima: 70, diaDesde: 26, diaHasta: 30, ventana: 'auto'},
  };
}

export async function readDb(): Promise<Database> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return JSON.parse(raw) as Database;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyDb();
    throw err;
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Lee, aplica el cambio y guarda, de a una escritura a la vez. */
export function updateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await fs.mkdir(DATA_DIR, {recursive: true});
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 1), 'utf8');
    await fs.rename(tmp, FILE);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
