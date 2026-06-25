// src/lib/calendarUtils.ts

export interface EventRow {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  tipo_eventos: number;
  usuario_id: number;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}

export type EventsByDate = Record<string, EventRow[]>;

export function getKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function normalizeDateKey(value: unknown): string {
  return String(value ?? '').slice(0, 10);
}

export function groupEvents(events: EventRow[]): EventsByDate {
  return events.reduce<EventsByDate>((acc, event) => {
    const key = normalizeDateKey(event.fecha);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
}

export function toDateTime(event: EventRow): Date {
  const dateKey = normalizeDateKey(event.fecha);
  const [year, month, day] = dateKey.split('-').map(Number);
  const timeParts = (event.hora_inicio ?? '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, timeParts[0] ?? 0, timeParts[1] ?? 0, timeParts[2] ?? 0);
}

export function getUpcomingEvents(eventsByDate: EventsByDate, limit = 8): EventRow[] {
  const now = new Date();
  const allEvents = Object.values(eventsByDate).flat();
  const future = allEvents
    .filter(e => toDateTime(e).getTime() >= now.getTime())
    .sort((a, b) => {
      const diff = toDateTime(a).getTime() - toDateTime(b).getTime();
      return diff !== 0 ? diff : a.nombre.localeCompare(b.nombre, 'es');
    })
    .slice(0, limit);

  return future.length > 0 ? future : allEvents
    .sort((a, b) => toDateTime(a).getTime() - toDateTime(b).getTime())
    .slice(0, limit);
}