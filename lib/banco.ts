import type {Question, SelfEvalQuestion, Topic} from './types';

// Banco de preguntas v1 (Reglamento Interno + ficha de Despacho de alimentos, nov 2026).
// Solo se usa para sembrar una base vacía; después Gerencia lo edita desde el panel.

const SI_NO = ['Sí', 'No'];

export const TEMAS_INICIALES: Topic[] = [
  {id: 't-obligaciones', nombre: 'Obligaciones del trabajador', puestos: [], orden: 1},
  {id: 't-prohibiciones', nombre: 'Prohibiciones', puestos: [], orden: 2},
  {id: 't-sanciones', nombre: 'Sanciones y multas', puestos: [], orden: 3},
  {id: 't-faltas', nombre: 'Faltas leves y graves', puestos: [], orden: 4},
  {id: 't-acoso', nombre: 'Lugar libre de acoso', puestos: [], orden: 5},
  {
    id: 't-despacho',
    nombre: 'Despacho de alimentos',
    puestos: ['Despacho de alimentos'],
    orden: 6,
  },
];

type Seed = [topicId: string, texto: string, opciones: string[] | 'sino', correcta: number];

const SEEDS: Seed[] = [
  // Obligaciones
  ['t-obligaciones', 'Si cambia de dirección o de número de teléfono, ¿en qué plazo debe comunicarlo a la empresa?', ['En los 30 días siguientes', 'En los 5 primeros días siguientes', 'No es necesario comunicarlo'], 1],
  ['t-obligaciones', 'Si falta por enfermedad, ¿con qué se justifica la falta?', ['Con un mensaje a un compañero', 'Con un certificado de cualquier médico particular', 'Con un certificado médico del IESS o del Ministerio de Salud Pública'], 2],
  ['t-obligaciones', '¿Puede contar a familiares o amigos información de los huéspedes o del hotel?', 'sino', 1],
  ['t-obligaciones', 'Al terminar la jornada, los documentos, herramientas y enseres de la empresa deben quedar:', ['Sobre el puesto de trabajo, ordenados', 'Bajo llave', 'Entregados al compañero del siguiente turno'], 1],
  ['t-obligaciones', 'Si ocurre un accidente de trabajo, ¿a quién debe avisar de inmediato?', ['Solo a sus compañeros de área', 'Al Técnico de Seguridad y Salud, al Representante Legal o a la Administración', 'A nadie, si no es grave'], 1],
  ['t-obligaciones', '¿Debe registrar en el sistema de asistencia tanto su entrada como su salida?', 'sino', 0],
  // Prohibiciones
  ['t-prohibiciones', '¿Puede prestar su clave del sistema a un compañero si usted está ocupado?', 'sino', 1],
  ['t-prohibiciones', 'Un proveedor o cliente le ofrece un regalo o un porcentaje a cambio de un favor. ¿Qué dice el reglamento?', ['Puede aceptarlo si es pequeño', 'Está prohibido exigirlo o recibirlo', 'Puede aceptarlo si avisa después'], 1],
  ['t-prohibiciones', 'El uso del celular en horas de trabajo está permitido:', ['Libremente, si no hay clientes', 'Solo para asuntos de estricta necesidad', 'Nunca, ni en emergencias'], 1],
  ['t-prohibiciones', '¿Puede encargar su trabajo a otro compañero sin autorización de su jefe inmediato?', 'sino', 1],
  ['t-prohibiciones', '¿Puede quedarse haciendo horas extra sin una orden expresa de su superior?', 'sino', 1],
  ['t-prohibiciones', '¿Puede comentar con otras personas la situación económica o las ventas del hotel?', 'sino', 1],
  // Sanciones
  ['t-sanciones', '¿Cuál de estas sanciones NO está en el reglamento?', ['Amonestación verbal', 'Amonestación escrita', 'Multa de hasta el 10 % de la remuneración', 'Suspensión de un mes sin sueldo'], 3],
  ['t-sanciones', '¿Cuál es la multa máxima en un mismo mes?', ['5 % de la remuneración', '10 % de la remuneración', '25 % de la remuneración'], 1],
  ['t-sanciones', '¿Cuántos minutos de atraso acumulados se toleran al mes antes de descontar cada minuto?', ['10 minutos', '30 minutos', '60 minutos'], 1],
  ['t-sanciones', 'Tres amonestaciones escritas al mismo trabajador en 30 días se consideran:', ['Una falta leve', 'Una falta grave', 'Nada, se reinician cada semana'], 1],
  ['t-sanciones', 'Si el trabajador se niega a firmar una amonestación escrita:', ['La amonestación queda anulada', 'Firma su jefe inmediato dejando constancia de que se negó', 'Se repite la amonestación al día siguiente'], 1],
  ['t-sanciones', '¿Las amonestaciones escritas van al expediente personal del trabajador?', 'sino', 0],
  // Faltas
  ['t-faltas', 'Presentarse a trabajar en estado de embriaguez es:', ['Falta leve', 'Falta grave (puede terminar el contrato)'], 1],
  ['t-faltas', 'Excederse sin justificación en el tiempo de permiso concedido es:', ['Falta leve', 'Falta grave'], 0],
  ['t-faltas', 'Encubrir la falta de un compañero es:', ['Falta leve', 'Falta grave', 'No es falta, es compañerismo'], 1],
  ['t-faltas', 'Olvidar registrar la asistencia es:', ['Falta leve', 'Falta grave'], 0],
  ['t-faltas', 'Alterar el registro de asistencia (marcar por otro, cambiar horas) es:', ['Falta leve', 'Falta grave'], 1],
  ['t-faltas', 'Dos o más faltas leves con amonestación escrita en el mismo mes:', ['Se mantienen como faltas leves', 'Se consideran falta grave'], 1],
  // Acoso
  ['t-acoso', 'Si se entera de un caso de acoso, ¿qué debe hacer?', ['No meterse, es asunto de otros', 'Alertar a la Administración', 'Contarlo a los compañeros'], 1],
  ['t-acoso', '¿Los reclamos por acoso se investigan de forma confidencial?', 'sino', 0],
  ['t-acoso', 'Usar palabras de doble sentido que ofenden a una persona es:', ['Una broma permitida', 'Acoso verbal'], 1],
  ['t-acoso', 'El acoso sexual comprobado es causa de:', ['Amonestación verbal', 'Visto Bueno (terminación del contrato)', 'Multa del 5 %'], 1],
  ['t-acoso', '¿Cuál de estas conductas es discriminación?', ['Pedir a un compañero que respete la fila', 'Burlarse de alguien por su edad, religión, raza o discapacidad', 'Corregir un error de trabajo con respeto'], 1],
  ['t-acoso', '¿Acosar u hostigar psicológicamente (mobbing) a un compañero es falta grave?', 'sino', 0],
  // Despacho de alimentos
  ['t-despacho', '¿Qué necesita para preparar o despachar un plato?', ['Que el mesero lo pida de palabra', 'La comanda del pedido'], 1],
  ['t-despacho', '¿Puede despachar platos o un evento sin comanda si hay mucha prisa?', 'sino', 1],
  ['t-despacho', 'Si un compañero lo trata mal cerca de una cámara de control interno, ¿qué debe hacer?', ['Responderle igual', 'Anotar la hora y reportarlo', 'Olvidarlo'], 1],
  ['t-despacho', 'Llamar "chismoso" o "sapo" a un compañero por reportar un incumplimiento es:', ['Normal entre compañeros', 'Falta grave del puesto'], 1],
  ['t-despacho', '¿Está prohibido tratar mal a sus compañeros con gestos o malas palabras?', 'sino', 0],
];

export const PREGUNTAS_INICIALES: Question[] = SEEDS.map(([topicId, texto, ops, correcta], i) => ({
  id: `p${String(i + 1).padStart(3, '0')}`,
  topicId,
  tipo: ops === 'sino' ? 'sino' : 'multiple',
  texto,
  opciones: ops === 'sino' ? [...SI_NO] : ops,
  correcta,
  activa: true,
}));

export const AUTOEVAL_INICIAL: SelfEvalQuestion[] = [
  '¿En este mes ha cometido alguna falta considerada grave?',
  '¿Ha llegado puntualmente al trabajo?',
  '¿Ha tratado de forma grosera a sus compañeros de trabajo?',
  '¿Ha hablado mal de la empresa a espaldas de la misma?',
  '¿Reportó algún maltrato hacia usted o hacia un compañero?',
  '¿Reportó quejas de clientes durante el servicio?',
].map((texto, i) => ({id: `a${i + 1}`, texto, orden: i + 1}));

export const MAX_PREGUNTAS_POR_TEMA = 6;
