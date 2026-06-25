import { describe, it, expect } from 'vitest';
import { getKey, normalizeDateKey, groupEvents, getUpcomingEvents } from './calendarUtils';
import type { EventRow } from './calendarUtils';

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: '1',
    nombre: 'Evento test',
    descripcion: '',
    color: '#FF0000',
    tipo_eventos: 1,
    usuario_id: 1,
    fecha: '2025-06-15',
    hora_inicio: null,
    hora_fin: null,
    ...overrides,
  };
}

describe('getKey', () => {
  it('formatea año, mes y día con ceros a la izquierda', () => {
    expect(getKey(2025, 1, 5)).toBe('2025-01-05');
  });

  it('no agrega cero cuando el mes y día ya tienen dos dígitos', () => {
    expect(getKey(2025, 12, 31)).toBe('2025-12-31');
  });
});

describe('normalizeDateKey', () => {
  it('toma solo los primeros 10 caracteres de una fecha con hora', () => {
    expect(normalizeDateKey('2025-06-15T10:30:00')).toBe('2025-06-15');
  });

  it('maneja null devolviendo string vacío', () => {
    expect(normalizeDateKey(null)).toBe('');
  });

  it('maneja undefined devolviendo string vacío', () => {
    expect(normalizeDateKey(undefined)).toBe('');
  });
});

describe('groupEvents', () => {
  it('agrupa eventos del mismo día bajo la misma clave', () => {
    const events = [
      makeEvent({ id: '1', fecha: '2025-06-15' }),
      makeEvent({ id: '2', fecha: '2025-06-15' }),
    ];
    const result = groupEvents(events);
    expect(result['2025-06-15']).toHaveLength(2);
  });

  it('separa eventos de días distintos en claves distintas', () => {
    const events = [
      makeEvent({ id: '1', fecha: '2025-06-15' }),
      makeEvent({ id: '2', fecha: '2025-06-20' }),
    ];
    const result = groupEvents(events);
    expect(result['2025-06-15']).toHaveLength(1);
    expect(result['2025-06-20']).toHaveLength(1);
  });

  it('devuelve objeto vacío para array vacío', () => {
    expect(groupEvents([])).toEqual({});
  });
});

describe('getUpcomingEvents', () => {
  it('devuelve solo eventos futuros ordenados por fecha', () => {
    const futuro1 = makeEvent({ id: '1', nombre: 'B', fecha: '2099-01-02', hora_inicio: '10:00' });
    const futuro2 = makeEvent({ id: '2', nombre: 'A', fecha: '2099-01-01', hora_inicio: '10:00' });
    const pasado  = makeEvent({ id: '3', nombre: 'C', fecha: '2000-01-01', hora_inicio: '10:00' });

    const grouped = {
      '2099-01-02': [futuro1],
      '2099-01-01': [futuro2],
      '2000-01-01': [pasado],
    };

    const result = getUpcomingEvents(grouped);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('1');
    expect(result.some(e => e.id === '3')).toBe(false);
  });

  it('respeta el límite de resultados', () => {
    const events: Record<string, EventRow[]> = {};
    for (let i = 1; i <= 10; i++) {
      const fecha = `2099-01-${String(i).padStart(2, '0')}`;
      events[fecha] = [makeEvent({ id: String(i), fecha })];
    }
    expect(getUpcomingEvents(events, 3)).toHaveLength(3);
  });
});