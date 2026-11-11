'use server';

import {revalidatePath} from 'next/cache';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {
  checkManagerPassword,
  checkPin,
  clearFailures,
  currentEmployee,
  endSession,
  hashPin,
  isManager,
  rateLimited,
  registerFailure,
  requireManager,
  startSession,
} from '@/lib/auth';
import {AREAS} from '@/lib/areas';
import {MAX_PREGUNTAS_POR_TEMA} from '@/lib/banco';
import {newId, readDb, updateDb} from '@/lib/db';
import {attemptOf, examWindow, freezeQuestions, grade} from '@/lib/exam';
import type {AreaId, QuestionType, WindowMode} from '@/lib/types';

export type FormState = {error?: string; ok?: string; cedula?: string} | null;

async function ip() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

// ───────────── Ingreso ─────────────

export async function loginEmpleado(_: FormState, f: FormData): Promise<FormState> {
  const cedula = str(f, 'cedula').replace(/\D/g, '');
  const pin = str(f, 'pin').replace(/\D/g, '');
  const key = `e:${await ip()}`;
  if (rateLimited(key)) return {error: 'Demasiados intentos. Espera 15 minutos o pide ayuda a Gerencia.'};
  if (cedula.length < 6 || pin.length !== 4) return {error: 'Escribe tu cédula y tu PIN de 4 dígitos.', cedula};
  const db = await readDb();
  const emp = db.empleados.find((e) => e.cedula === cedula);
  if (!emp || !checkPin(pin, emp.pinHash)) {
    registerFailure(key);
    return {error: 'La cédula o el PIN no coinciden. Revisa e intenta otra vez.', cedula};
  }
  if (!emp.activo) return {error: 'Tu usuario está pausado. Habla con Gerencia.'};
  clearFailures(key);
  await startSession({t: 'e', id: emp.id});
  redirect('/empleado');
}

export async function loginGerencia(_: FormState, f: FormData): Promise<FormState> {
  const key = `m:${await ip()}`;
  if (rateLimited(key)) return {error: 'Demasiados intentos. Espera 15 minutos.'};
  if (!checkManagerPassword(str(f, 'clave'))) {
    registerFailure(key);
    return {error: 'Clave incorrecta.'};
  }
  clearFailures(key);
  await startSession({t: 'm'});
  redirect('/gerencia');
}

export async function salir() {
  const wasManager = await isManager();
  await endSession();
  redirect(wasManager ? '/gerencia/ingreso' : '/');
}

// ───────────── Examen del empleado ─────────────

export async function iniciarExamen() {
  const emp = await currentEmployee();
  if (!emp) redirect('/');
  await updateDb((db) => {
    const w = examWindow(db.ajustes);
    if (!w.open || attemptOf(db, emp.id, w.mes)) return;
    const now = new Date().toISOString();
    db.intentos.push({
      id: newId('i'),
      empleadoId: emp.id,
      mes: w.mes,
      iniciado: now,
      actualizado: now,
      preguntas: freezeQuestions(db, emp),
      autoevalPreguntas: [...db.autoeval].sort((a, b) => a.orden - b.orden).map(({id, texto}) => ({id, texto})),
      respuestas: {},
      autoeval: {},
      contradicciones: {},
    });
  });
  redirect('/empleado/examen');
}

export type AnswerKind = 'pregunta' | 'autoeval' | 'voto';

/** Guarda cada respuesta apenas se toca, para no perder nada si se cae la señal. */
export async function guardarRespuesta(kind: AnswerKind, key: string, value: number | boolean | string | null) {
  const emp = await currentEmployee();
  if (!emp) return {error: 'Tu sesión venció. Vuelve a ingresar.'};
  return updateDb((db) => {
    const w = examWindow(db.ajustes);
    const a = attemptOf(db, emp.id, w.mes);
    if (!a || a.enviado) return {error: 'Este examen ya no se puede modificar.'};
    if (!w.open) return {error: 'El examen está cerrado.'};
    if (kind === 'pregunta') {
      const q = a.preguntas.find((p) => p.id === key);
      if (!q || typeof value !== 'number' || value < 0 || value >= q.opciones.length) return {error: 'Respuesta no válida.'};
      a.respuestas[key] = value;
    } else if (kind === 'autoeval') {
      if (!a.autoevalPreguntas.some((p) => p.id === key) || typeof value !== 'boolean') return {error: 'Respuesta no válida.'};
      a.autoeval[key] = value;
    } else {
      const ok = value === null || db.empleados.some((e) => e.id === value && e.id !== emp.id && e.activo);
      if (!ok) return {error: 'Compañero no válido.'};
      a.votoAmable = value as string | null;
    }
    a.actualizado = new Date().toISOString();
    return {ok: true};
  });
}

export async function enviarExamen(): Promise<{error?: string}> {
  const emp = await currentEmployee();
  if (!emp) return {error: 'Tu sesión venció. Vuelve a ingresar.'};
  const res = await updateDb((db) => {
    const w = examWindow(db.ajustes);
    const a = attemptOf(db, emp.id, w.mes);
    if (!a) return {error: 'No hay examen iniciado.'};
    if (a.enviado) return {};
    const faltan = a.preguntas.filter((q) => a.respuestas[q.id] === undefined).length +
      a.autoevalPreguntas.filter((q) => a.autoeval[q.id] === undefined).length;
    if (faltan > 0) return {error: `Te faltan ${faltan} respuestas.`};
    const g = grade(a);
    a.nota = g.nota;
    a.porTema = g.porTema;
    a.enviado = new Date().toISOString();
    a.actualizado = a.enviado;
    return {};
  });
  if (res.error) return res;
  revalidatePath('/empleado');
  redirect('/empleado/resultado');
}

// ───────────── Gerencia: empleados ─────────────

export async function guardarEmpleado(_: FormState, f: FormData): Promise<FormState> {
  await requireManager();
  const id = str(f, 'id');
  const nombre = str(f, 'nombre').replace(/\s+/g, ' ');
  const cedula = str(f, 'cedula').replace(/\D/g, '');
  const area = str(f, 'area') as AreaId;
  const puesto = str(f, 'puesto');
  const pin = str(f, 'pin').replace(/\D/g, '');
  const areaDef = AREAS.find((a) => a.id === area);
  if (nombre.length < 3) return {error: 'Escribe el nombre completo.'};
  if (cedula.length !== 10) return {error: 'La cédula debe tener 10 dígitos.'};
  if (!areaDef || !areaDef.puestos.includes(puesto)) return {error: 'Elige un área y un puesto válidos.'};
  if ((!id && pin.length !== 4) || (pin && pin.length !== 4)) return {error: 'El PIN debe tener 4 dígitos.'};
  const result = await updateDb((db) => {
    if (db.empleados.some((e) => e.cedula === cedula && e.id !== id)) return {error: 'Ya existe un empleado con esa cédula.'};
    if (id) {
      const e = db.empleados.find((x) => x.id === id);
      if (!e) return {error: 'Empleado no encontrado.'};
      Object.assign(e, {nombre, cedula, area, puesto});
      if (pin) e.pinHash = hashPin(pin);
      return {ok: 'Cambios guardados.', id};
    }
    const nid = newId('e');
    db.empleados.push({id: nid, nombre, cedula, pinHash: hashPin(pin), area, puesto, activo: true, creado: new Date().toISOString()});
    return {ok: 'Empleado creado.', id: nid};
  });
  revalidatePath('/gerencia', 'layout');
  if ('id' in result && result.id && !id) redirect(`/gerencia/empleados/${result.id}?nuevo=1`);
  return result.error ? {error: result.error} : {ok: result.ok};
}

export async function cambiarEstadoEmpleado(id: string, activo: boolean) {
  await requireManager();
  await updateDb((db) => {
    const e = db.empleados.find((x) => x.id === id);
    if (e) e.activo = activo;
  });
  revalidatePath('/gerencia', 'layout');
}

/** Borra el intento del mes para que el empleado vuelva a rendir. */
export async function reabrirIntento(intentoId: string) {
  await requireManager();
  await updateDb((db) => {
    db.intentos = db.intentos.filter((i) => i.id !== intentoId);
  });
  revalidatePath('/gerencia', 'layout');
}

export async function marcarContradiccion(intentoId: string, preguntaId: string, nota: string) {
  await requireManager();
  await updateDb((db) => {
    const a = db.intentos.find((i) => i.id === intentoId);
    if (!a) return;
    const n = nota.trim().slice(0, 300);
    if (n) a.contradicciones[preguntaId] = n;
    else delete a.contradicciones[preguntaId];
  });
  revalidatePath('/gerencia', 'layout');
}

// ───────────── Gerencia: banco de preguntas ─────────────

export async function guardarPregunta(_: FormState, f: FormData): Promise<FormState> {
  await requireManager();
  const id = str(f, 'id');
  const topicId = str(f, 'topicId');
  const tipo = str(f, 'tipo') as QuestionType;
  const texto = str(f, 'texto');
  const opciones = tipo === 'sino' ? ['Sí', 'No'] : f.getAll('opcion').map((o) => String(o).trim()).filter(Boolean);
  const correcta = Number(f.get('correcta'));
  if (texto.length < 8) return {error: 'Escribe la pregunta completa.'};
  if (tipo !== 'sino' && tipo !== 'multiple') return {error: 'Tipo de pregunta no válido.'};
  if (opciones.length < 2) return {error: 'Pon al menos 2 opciones.'};
  if (!Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) return {error: 'Marca cuál es la respuesta correcta.'};
  const res = await updateDb((db) => {
    if (!db.temas.some((t) => t.id === topicId)) return {error: 'Tema no encontrado.'};
    const enTema = db.preguntas.filter((q) => q.topicId === topicId && q.activa && q.id !== id).length;
    if (enTema >= MAX_PREGUNTAS_POR_TEMA) return {error: `Este tema ya tiene ${MAX_PREGUNTAS_POR_TEMA} preguntas. Quita una antes de agregar otra.`};
    if (id) {
      const q = db.preguntas.find((x) => x.id === id);
      if (!q) return {error: 'Pregunta no encontrada.'};
      Object.assign(q, {topicId, tipo, texto, opciones, correcta, activa: true});
      return {ok: 'Pregunta actualizada.'};
    }
    db.preguntas.push({id: newId('p'), topicId, tipo, texto, opciones, correcta, activa: true});
    return {ok: 'Pregunta agregada.'};
  });
  revalidatePath('/gerencia/preguntas');
  return res;
}

export async function eliminarPregunta(id: string) {
  await requireManager();
  await updateDb((db) => {
    db.preguntas = db.preguntas.filter((q) => q.id !== id);
  });
  revalidatePath('/gerencia/preguntas');
}

export async function guardarTema(_: FormState, f: FormData): Promise<FormState> {
  await requireManager();
  const id = str(f, 'id');
  const nombre = str(f, 'nombre');
  const puestos = f.getAll('puesto').map(String);
  if (nombre.length < 3) return {error: 'Escribe el nombre del tema.'};
  await updateDb((db) => {
    const t = db.temas.find((x) => x.id === id);
    if (t) Object.assign(t, {nombre, puestos});
    else db.temas.push({id: newId('t'), nombre, puestos, orden: db.temas.length + 1});
  });
  revalidatePath('/gerencia/preguntas');
  return {ok: id ? 'Tema actualizado.' : 'Tema creado.'};
}

export async function eliminarTema(id: string) {
  await requireManager();
  await updateDb((db) => {
    db.temas = db.temas.filter((t) => t.id !== id);
    db.preguntas = db.preguntas.filter((q) => q.topicId !== id);
  });
  revalidatePath('/gerencia/preguntas');
}

// ───────────── Gerencia: premios y ajustes ─────────────

export async function guardarPremio(mes: string, empleadoId: string, campo: 'vinos' | 'calificacionClientes', valor: string) {
  await requireManager();
  const n = valor.trim() === '' ? undefined : Number(valor.replace(',', '.'));
  if (n !== undefined && (!Number.isFinite(n) || n < 0)) return;
  await updateDb((db) => {
    let p = db.premios.find((x) => x.mes === mes && x.empleadoId === empleadoId);
    if (!p) db.premios.push((p = {mes, empleadoId}));
    p[campo] = n;
  });
  revalidatePath('/gerencia/resultados');
}

export async function guardarAjustes(_: FormState, f: FormData): Promise<FormState> {
  await requireManager();
  const notaMinima = Number(f.get('notaMinima'));
  const ventana = str(f, 'ventana') as WindowMode;
  if (!Number.isInteger(notaMinima) || notaMinima < 1 || notaMinima > 100) return {error: 'La nota mínima va de 1 a 100.'};
  if (!['auto', 'abierta', 'cerrada'].includes(ventana)) return {error: 'Opción de ventana no válida.'};
  await updateDb((db) => {
    db.ajustes.notaMinima = notaMinima;
    db.ajustes.ventana = ventana;
  });
  revalidatePath('/', 'layout');
  return {ok: 'Ajustes guardados.'};
}
