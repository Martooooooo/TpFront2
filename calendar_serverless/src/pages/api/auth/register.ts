import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const nombre = String(body.nombre ?? '').trim();
  const contrasena = String(body.contrasena ?? '').trim();

  if (!nombre || !contrasena) {
    return json({ error: 'nombre y contrasena son obligatorios' }, 400);
  }

  const existing = await sql`
    SELECT id
    FROM usuarios
    WHERE "Nombre" = ${nombre}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return json({ error: 'el usuario ya existe' }, 409);
  }

  const created = await sql`
    INSERT INTO usuarios ("Nombre", "Contraseña")
    VALUES (${nombre}, ${contrasena})
    RETURNING id, "Nombre" AS nombre
  `;

  return json(created[0], 201);
};