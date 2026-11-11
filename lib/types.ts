export type AreaId = 'recepcion' | 'alimentos' | 'pisos' | 'lavanderia';

export interface Area {
  id: AreaId;
  nombre: string;
  puestos: string[];
}

export interface Employee {
  id: string;
  nombre: string;
  cedula: string;
  pinHash: string;
  area: AreaId;
  puesto: string;
  activo: boolean;
  creado: string;
  demo?: boolean;
}

export type QuestionType = 'sino' | 'multiple';

export interface Topic {
  id: string;
  nombre: string;
  /** Vacío = lo rinden todos. Con valores = solo esos puestos. */
  puestos: string[];
  orden: number;
}

export interface Question {
  id: string;
  topicId: string;
  tipo: QuestionType;
  texto: string;
  opciones: string[];
  correcta: number;
  activa: boolean;
}

export interface SelfEvalQuestion {
  id: string;
  texto: string;
  orden: number;
}

/** Pregunta congelada al iniciar el intento: editar el banco después no altera la nota. */
export interface FrozenQuestion {
  id: string;
  topicId: string;
  topicNombre: string;
  tipo: QuestionType;
  texto: string;
  opciones: string[];
  correcta: number;
}

export interface TopicScore {
  topicId: string;
  nombre: string;
  aciertos: number;
  total: number;
}

export interface Attempt {
  id: string;
  empleadoId: string;
  mes: string; // YYYY-MM
  iniciado: string;
  actualizado: string;
  enviado?: string;
  preguntas: FrozenQuestion[];
  autoevalPreguntas: {id: string; texto: string}[];
  respuestas: Record<string, number>;
  autoeval: Record<string, boolean>;
  votoAmable?: string | null;
  nota?: number; // 0–100
  porTema?: TopicScore[];
  contradicciones: Record<string, string>;
}

export interface Award {
  mes: string;
  empleadoId: string;
  vinos?: number;
  calificacionClientes?: number;
}

export type WindowMode = 'auto' | 'abierta' | 'cerrada';

export interface Settings {
  notaMinima: number;
  diaDesde: number;
  diaHasta: number;
  ventana: WindowMode;
}

export interface Database {
  version: 1;
  empleados: Employee[];
  temas: Topic[];
  preguntas: Question[];
  autoeval: SelfEvalQuestion[];
  intentos: Attempt[];
  premios: Award[];
  ajustes: Settings;
}
