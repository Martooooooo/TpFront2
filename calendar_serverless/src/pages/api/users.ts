import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async () => {
  const users = await sql`
    SELECT id, "Nombre" AS nombre
    FROM usuarios
    ORDER BY id ASC
  `;

  return json(users);
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const nombre = String(body.nombre ?? '').trim();
  const contrasena = String(body.contrasena ?? '').trim();

  if (!nombre || !contrasena) {
    return json({ error: 'nombre y contrasena son obligatorios' }, 400);
  }

  const created = await sql`
    INSERT INTO usuarios ("Nombre", "Contraseña")
    VALUES (${nombre}, ${contrasena})
    RETURNING id, "Nombre" AS nombre
  `;

  return json(created[0], 201);
};