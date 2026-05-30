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
    SELECT id, "Nombre" AS nombre, "Contraseña" AS contrasena
    FROM usuarios
    WHERE "Nombre" = ${nombre}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const user = existing[0] as { id: number; nombre: string; contrasena: string };

    if (user.contrasena !== contrasena) {
      return json({ error: 'contraseña incorrecta' }, 401);
    }

    return json({ id: user.id, nombre: user.nombre }, 200);
  }

  return json({ error: 'usuario no encontrado' }, 404);
};