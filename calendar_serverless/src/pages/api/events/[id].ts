import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export const DELETE: APIRoute = async ({ params, url }) => {
  const eventId = String(params.id ?? '').trim();
  const usuarioId = Number(url.searchParams.get('usuario_id'));

  if (!eventId || !Number.isInteger(usuarioId)) {
    return json({ error: 'id o usuario_id invalido' }, 400);
  }

  const deleted = await sql`
    DELETE FROM eventos
    WHERE id = ${eventId}
      AND usuario_id = ${usuarioId}
    RETURNING id
  `;

  if (deleted.length === 0) {
    return json({ error: 'evento no encontrado' }, 404);
  }

  return json({ ok: true });
};