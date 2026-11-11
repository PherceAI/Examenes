import type {Area, AreaId} from './types';

export const AREAS: Area[] = [
  {id: 'recepcion', nombre: 'Recepción', puestos: ['Recepcionista', 'Botones']},
  {
    id: 'alimentos',
    nombre: 'Alimentos y bebidas',
    puestos: ['Despacho de alimentos', 'Cocina', 'Mesero', 'Bar'],
  },
  {id: 'pisos', nombre: 'Pisos y limpieza', puestos: ['Camarera de pisos', 'Limpieza de áreas']},
  {id: 'lavanderia', nombre: 'Lavandería', puestos: ['Lavandería']},
];

export const ALL_PUESTOS = AREAS.flatMap((a) => a.puestos);

export function areaById(id: AreaId): Area {
  return AREAS.find((a) => a.id === id) || AREAS[0];
}

/** Clase CSS que fija la variable --band con el color del área. */
export function areaClass(id: AreaId): string {
  return `area-${id}`;
}
