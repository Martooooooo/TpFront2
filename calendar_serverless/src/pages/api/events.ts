import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeTime(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

export const GET: APIRoute = async ({ url }) => {
  const usuarioId = Number(url.searchParams.get('usuario_id'));

  if (!Number.isInteger(usuarioId)) {
    return json({ error: 'usuario_id invalido' }, 400);
  }

  const events = await sql`
    SELECT
      id,
      "Nombre" AS nombre,
      "Descripcion" AS descripcion,
      "Color" AS color,
      tipo_eventos,
      usuario_id,
      fecha,
      hora_inicio,
      hora_fin
    FROM eventos
    WHERE usuario_id = ${usuarioId}
    ORDER BY fecha ASC, hora_inicio ASC NULLS LAST, id ASC
  `;

  return json(events);
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const nombre = String(body.nombre ?? '').trim();
  const descripcion = String(body.descripcion ?? '').trim();
  const color = String(body.color ?? '').trim();
  const fecha = String(body.fecha ?? '').trim();
  const usuarioId = Number(body.usuario_id);
  const tipoEventos = Number(body.tipo_eventos);
  const horaInicio = normalizeTime(body.hora_inicio);
  const horaFin = normalizeTime(body.hora_fin);

  if (!nombre || !color || !fecha || !Number.isInteger(usuarioId) || !Number.isInteger(tipoEventos)) {
    return json({ error: 'faltan campos obligatorios' }, 400);
  }

  const created = await sql`
    INSERT INTO eventos (
      id,
      "Nombre",
      "Descripcion",
      "Color",
      tipo_eventos,
      usuario_id,
      fecha,
      hora_inicio,
      hora_fin
    )
    VALUES (
      ${crypto.randomUUID()},
      ${nombre},
      ${descripcion},
      ${color},
      ${tipoEventos},
      ${usuarioId},
      ${fecha},
      ${horaInicio},
      ${horaFin}
    )
    RETURNING
      id,
      "Nombre" AS nombre,
      "Descripcion" AS descripcion,
      "Color" AS color,
      tipo_eventos,
      usuario_id,
      fecha,
      hora_inicio,
      hora_fin
  `;

  return json(created[0], 201);
};