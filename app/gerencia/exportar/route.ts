import {NextResponse, type NextRequest} from 'next/server';
import {isManager} from '@/lib/auth';
import {readDb} from '@/lib/db';
import {areaById} from '@/lib/areas';
import {examWindow} from '@/lib/exam';
import {statusLabel} from '@/components/ui';
import {monthRows} from '@/lib/stats';

export async function GET(req: NextRequest) {
  if (!(await isManager())) return NextResponse.redirect(new URL('/gerencia/ingreso', req.url));
  const db = await readDb();
  const qMes = req.nextUrl.searchParams.get('mes') || '';
  const mes = /^\d{4}-\d{2}$/.test(qMes) ? qMes : examWindow(db.ajustes).mes;
  const temas = [...db.temas].sort((a, b) => a.orden - b.orden);
  const rows = monthRows(db, mes);
  const votos = new Map<string, number>();
  for (const r of rows) if (r.attempt?.enviado && r.attempt.votoAmable) votos.set(r.attempt.votoAmable, (votos.get(r.attempt.votoAmable) || 0) + 1);

  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Empleado', 'Cédula', 'Área', 'Puesto', 'Estado', 'Nota', ...temas.map((t) => t.nombre), 'Autoevaluaciones contradichas', 'Votos más amable', 'Vinos', 'Calificación clientes'];
  const lines = rows.map((r) => {
    const a = r.attempt?.enviado ? r.attempt : undefined;
    const p = db.premios.find((x) => x.mes === mes && x.empleadoId === r.emp.id);
    return [
      r.emp.nombre,
      r.emp.cedula,
      areaById(r.emp.area).nombre,
      r.emp.puesto,
      statusLabel(r.status),
      a?.nota,
      ...temas.map((t) => {
        const s = a?.porTema?.find((x) => x.topicId === t.id);
        return s ? `${s.aciertos} de ${s.total}` : ''; // "3/6" Excel lo convertiría en fecha
      }),
      r.attempt ? Object.keys(r.attempt.contradicciones).length : '',
      votos.get(r.emp.id) || 0,
      p?.vinos,
      p?.calificacionClientes === undefined ? '' : String(p.calificacionClientes).replace('.', ','),
    ];
  });
  // Punto y coma + BOM: Excel en español lo abre en columnas y con tildes correctas.
  const csv = '﻿' + [header, ...lines].map((l) => l.map(esc).join(';')).join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="evaluaciones-${mes}.csv"`,
    },
  });
}
