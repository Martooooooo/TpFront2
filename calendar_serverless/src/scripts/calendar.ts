const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const COLORS = ['#E24B4A', '#D85A30', '#BA7517', '#639922', '#1D9E75', '#185FA5', '#7F77DD', '#D4537E', '#888780'];
const CATEGORY_LABELS: Record<number, string> = {
  1: 'Trabajo',
  2: 'Escuela',
  3: 'Personal',
  4: 'Entretenimiento',
};

interface User {
  id: number;
  nombre: string;
}

interface EventRow {
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

type EventsByDate = Record<string, EventRow[]>;

const STORAGE_KEY = 'calendar.currentUserId';
const today = new Date();

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Falta el elemento ${id}`);
  }

  return element as T;
}

function getKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatKeyLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month, day);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) as unknown : null;

  if (!response.ok) {
    throw new Error(String((payload as { error?: string } | null)?.error ?? `HTTP ${response.status}`));
  }

  return payload as T;
}

function normalizeDateKey(value: unknown) {
  return String(value ?? '').slice(0, 10);
}

const calEl = getRequiredElement<HTMLDivElement>('cal');
const monthLabel = getRequiredElement<HTMLSpanElement>('mlabel');
const selLabel = getRequiredElement<HTMLDivElement>('sel-label');
const evList = getRequiredElement<HTMLDivElement>('events-list');
const drawerToggleBtn = getRequiredElement<HTMLButtonElement>('drawer-toggle-btn');
const drawerOverlay = getRequiredElement<HTMLDivElement>('drawer-overlay');
const upcomingDrawer = getRequiredElement<HTMLElement>('upcoming-drawer');
const closeDrawerBtn = getRequiredElement<HTMLButtonElement>('close-drawer-btn');
const drawerList = getRequiredElement<HTMLDivElement>('drawer-list');
const drawerCount = getRequiredElement<HTMLDivElement>('drawer-count');
const loginBtn = getRequiredElement<HTMLButtonElement>('login-btn');
const registerBtn = getRequiredElement<HTMLButtonElement>('register-btn');
const loginModal = getRequiredElement<HTMLDivElement>('login-modal');
const closeLoginBtn = getRequiredElement<HTMLButtonElement>('close-login-btn');
const submitRegisterBtn = getRequiredElement<HTMLButtonElement>('submit-register-btn');
const submitLoginBtn = getRequiredElement<HTMLButtonElement>('submit-login-btn');
const loginName = getRequiredElement<HTMLInputElement>('login-name');
const loginPassword = getRequiredElement<HTMLInputElement>('login-password');
const loginStatus = getRequiredElement<HTMLDivElement>('login-status');
const authTitle = getRequiredElement<HTMLDivElement>('auth-title');
const authText = getRequiredElement<HTMLDivElement>('auth-text');
const userStatus = getRequiredElement<HTMLDivElement>('user-status');
const addBtn = getRequiredElement<HTMLButtonElement>('add-btn');
const colorPicker = getRequiredElement<HTMLDivElement>('color-picker');
const eventName = getRequiredElement<HTMLInputElement>('f-name');
const eventCategory = getRequiredElement<HTMLSelectElement>('f-cat');
const eventStart = getRequiredElement<HTMLInputElement>('f-start');
const eventEnd = getRequiredElement<HTMLInputElement>('f-end');
const eventDesc = getRequiredElement<HTMLTextAreaElement>('f-desc');
const prevBtn = getRequiredElement<HTMLButtonElement>('prev');
const nextBtn = getRequiredElement<HTMLButtonElement>('next');

let vy = today.getFullYear();
let vm = today.getMonth();
let selectedDateKey = getKey(today.getFullYear(), today.getMonth(), today.getDate());
let selectedColor = COLORS[5];
let currentUser: User | null = null;
let eventsByDate: EventsByDate = {};
let authMode: 'login' | 'register' = 'login';

function setEventControlsEnabled(enabled: boolean) {
  eventName.disabled = !enabled;
  eventCategory.disabled = !enabled;
  eventStart.disabled = !enabled;
  eventEnd.disabled = !enabled;
  eventDesc.disabled = !enabled;
  addBtn.disabled = !enabled;
}

function renderCalendar() {
  monthLabel.textContent = `${MONTHS[vm]} ${vy}`;
  calEl.innerHTML = '';

  const first = new Date(vy, vm, 1).getDay();
  const dim = new Date(vy, vm + 1, 0).getDate();

  for (let index = 0; index < first; index += 1) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    calEl.appendChild(empty);
  }

  for (let day = 1; day <= dim; day += 1) {
    const key = getKey(vy, vm, day);
    const dayCard = document.createElement('div');
    dayCard.className = 'day';

    if (day === today.getDate() && vm === today.getMonth() && vy === today.getFullYear()) {
      dayCard.classList.add('today');
    }

    if (selectedDateKey === key) {
      dayCard.classList.add('selected');
    }

    const number = document.createElement('div');
    number.className = 'dnum';
    number.textContent = String(day);
    dayCard.appendChild(number);

    const dots = (eventsByDate[key] ?? []).slice(0, 5);
    if (dots.length > 0) {
      const dotRow = document.createElement('div');
      dotRow.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap;margin-top:2px;';

      dots.forEach((event) => {
        const dot = document.createElement('div');
        dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${event.color};flex-shrink:0;`;
        dotRow.appendChild(dot);
      });

      dayCard.appendChild(dotRow);
    }

    dayCard.addEventListener('click', () => {
      selectedDateKey = key;
      renderCalendar();
      renderEventsList();
    });

    calEl.appendChild(dayCard);
  }
}

function renderEventsList() {
  evList.innerHTML = '';
  selLabel.textContent = formatKeyLabel(selectedDateKey);

  if (!currentUser) {
    evList.innerHTML = '<div class="no-events">Iniciá sesión para ver tus eventos</div>';
    return;
  }

  const events = eventsByDate[selectedDateKey] ?? [];

  if (!events.length) {
    evList.innerHTML = '<div class="no-events">Sin eventos este día</div>';
    return;
  }

  events.forEach((event) => {
    const card = document.createElement('div');
    card.className = 'ecard';
    card.style.background = event.color;

    const metaParts = [CATEGORY_LABELS[event.tipo_eventos] ?? 'Sin categoría'];
    const timeRange = [event.hora_inicio, event.hora_fin].filter(Boolean).join(' - ');
    if (timeRange) {
      metaParts.push(timeRange);
    }

    card.innerHTML = `
      <div class="ecard-name">${event.nombre}</div>
      <div class="ecard-meta">${metaParts.join(' · ')}</div>
      <button class="ecard-del" title="Eliminar">✕</button>
    `;

    const deleteButton = card.querySelector<HTMLButtonElement>('.ecard-del');
    if (deleteButton) {
      deleteButton.addEventListener('click', async () => {
        await requestJson(`/api/events/${event.id}?usuario_id=${currentUser?.id ?? ''}`, {
          method: 'DELETE',
        });
        await loadEvents();
      });
    }

    evList.appendChild(card);
  });
}

function groupEvents(events: EventRow[]): EventsByDate {
  return events.reduce<EventsByDate>((accumulator, event) => {
    const key = normalizeDateKey(event.fecha);
    if (!key) {
      return accumulator;
    }

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(event);
    return accumulator;
  }, {});
}

function formatUpcomingLabel(key: string) {
  const [year, month, day] = normalizeDateKey(key).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const todayKey = getKey(today.getFullYear(), today.getMonth(), today.getDate());

  if (key === todayKey) {
    return 'Hoy';
  }

  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowKey = getKey(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (key === tomorrowKey) {
    return 'Mañana';
  }

  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function toDateTime(event: EventRow) {
  const dateKey = normalizeDateKey(event.fecha);
  const [year, month, day] = dateKey.split('-').map(Number);
  const timeParts = (event.hora_inicio ?? '00:00').split(':').map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const seconds = timeParts[2] ?? 0;

  return new Date(year, month - 1, day, hours, minutes, seconds);
}

function getUpcomingEvents(limit = 8) {
  const now = new Date();
  const allEvents = Object.values(eventsByDate).flat();
  const futureEvents = allEvents
    .filter((event) => toDateTime(event).getTime() >= now.getTime())
    .sort((first, second) => {
      const dateDiff = toDateTime(first).getTime() - toDateTime(second).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return first.nombre.localeCompare(second.nombre, 'es');
    })
    .slice(0, limit);

  if (futureEvents.length > 0) {
    return futureEvents;
  }

  return allEvents
    .sort((first, second) => {
      const dateDiff = toDateTime(first).getTime() - toDateTime(second).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return first.nombre.localeCompare(second.nombre, 'es');
    })
    .slice(0, limit);
}

function openUpcomingDrawer() {
  if (!currentUser) {
    return;
  }

  upcomingDrawer.classList.add('open');
  drawerOverlay.classList.remove('hidden');
  drawerToggleBtn.setAttribute('aria-expanded', 'true');
}

function closeUpcomingDrawer() {
  upcomingDrawer.classList.remove('open');
  drawerOverlay.classList.add('hidden');
  drawerToggleBtn.setAttribute('aria-expanded', 'false');
}

function setUpcomingDrawerVisible(visible: boolean) {
  drawerToggleBtn.classList.toggle('hidden', !visible);
  upcomingDrawer.classList.toggle('hidden', !visible);

  if (!visible) {
    closeUpcomingDrawer();
  }
}

function renderUpcomingDrawer() {
  const upcomingEvents = getUpcomingEvents();
  drawerCount.textContent = upcomingEvents.length === 1 ? '1 evento próximo' : `${upcomingEvents.length} eventos próximos`;

  if (!currentUser) {
    setUpcomingDrawerVisible(false);
    drawerList.innerHTML = '<div class="drawer-empty">Iniciá sesión para ver tus próximos eventos guardados en la base de datos.</div>';
    return;
  }

  setUpcomingDrawerVisible(true);

  if (!upcomingEvents.length) {
    drawerList.innerHTML = '<div class="drawer-empty">No hay eventos guardados todavía. Cuando crees uno, va a aparecer acá.</div>';
    return;
  }

  drawerList.innerHTML = '';

  upcomingEvents.forEach((event) => {
    const card = document.createElement('article');
    card.className = 'drawer-event';
    card.innerHTML = `
      <div class="drawer-event-top">
        <div>
          <div class="drawer-event-name">${event.nombre}</div>
          <div class="drawer-event-date">${formatUpcomingLabel(event.fecha)}</div>
        </div>
        <div class="drawer-event-time">${[event.hora_inicio, event.hora_fin].filter(Boolean).join(' - ') || 'Sin hora'}</div>
      </div>
      ${event.descripcion ? `<div class="drawer-event-desc">${event.descripcion}</div>` : ''}
      <div class="drawer-event-badge">
        <span class="drawer-dot" style="background:${event.color}"></span>
        ${CATEGORY_LABELS[event.tipo_eventos] ?? 'Sin categoría'}
      </div>
    `;
    drawerList.appendChild(card);
  });
}

async function loadEvents() {
  if (!currentUser) {
    eventsByDate = {};
    renderCalendar();
    renderUpcomingDrawer();
    renderEventsList();
    return;
  }

  const events = await requestJson<EventRow[]>(`/api/events?usuario_id=${currentUser.id}`);
  eventsByDate = groupEvents(events);
  renderCalendar();
  renderUpcomingDrawer();
  renderEventsList();
}

function openAuthModal(mode: 'login' | 'register') {
  authMode = mode;
  authTitle.textContent = mode === 'register' ? 'Registrarte' : 'Iniciar sesión';
  authText.textContent = mode === 'register'
    ? 'Creá tu cuenta y después quedás logueado automáticamente.'
    : 'Ingresá con tu cuenta para habilitar el calendario.';
  loginStatus.textContent = '';
  loginModal.classList.remove('hidden');
  loginName.focus();
}

function closeLoginModal() {
  loginModal.classList.add('hidden');
  loginName.value = '';
  loginPassword.value = '';
  loginStatus.textContent = '';
}

async function authenticate(mode: 'login' | 'register') {
  const nombre = loginName.value.trim();
  const contrasena = loginPassword.value.trim();

  if (!nombre || !contrasena) {
    loginStatus.textContent = 'Completá usuario y contraseña.';
    return;
  }

  const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const user = await requestJson<User>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ nombre, contrasena }),
  });

  currentUser = user;
  localStorage.setItem(STORAGE_KEY, String(user.id));
  userStatus.textContent = mode === 'register'
    ? `Cuenta creada y sesión iniciada como ${user.nombre}`
    : `Sesión iniciada como ${user.nombre}`;
  loginBtn.textContent = `Cerrar sesión (${user.nombre})`;
  loginBtn.dataset.loggedIn = 'true';
  // Hide the register button when logged in
  registerBtn.classList.add('hidden');
  closeLoginModal();
  setEventControlsEnabled(true);
  await loadEvents();
}

async function logout() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEY);
  userStatus.textContent = 'Iniciá sesión para habilitar el calendario';
  loginBtn.textContent = 'Iniciar sesión';
  delete loginBtn.dataset.loggedIn;
  // Show the register button when logged out
  registerBtn.classList.remove('hidden');
  setEventControlsEnabled(false);
  eventsByDate = {};
  setUpcomingDrawerVisible(false);
  renderCalendar();
  renderEventsList();
  renderUpcomingDrawer();
}

async function restoreSession() {
  const storedUserId = localStorage.getItem(STORAGE_KEY);
  if (!storedUserId) {
    setEventControlsEnabled(false);
    renderCalendar();
    renderEventsList();
    renderUpcomingDrawer();
    return;
  }

  const users = await requestJson<User[]>('/api/users');
  const storedUser = users.find((user) => String(user.id) === storedUserId) ?? null;

  if (!storedUser) {
    await logout();
    return;
  }

  currentUser = storedUser;
  userStatus.textContent = `Sesión iniciada como ${storedUser.nombre}`;
  loginBtn.textContent = `Cerrar sesión (${storedUser.nombre})`;
  loginBtn.dataset.loggedIn = 'true';
  // Hide the register button when restoring a session
  registerBtn.classList.add('hidden');
  setEventControlsEnabled(true);
  await loadEvents();
}

async function createEvent() {
  if (!currentUser) {
    return;
  }

  const nombre = eventName.value.trim();
  if (!nombre) {
    return;
  }

  await requestJson<EventRow>('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      descripcion: eventDesc.value.trim(),
      color: selectedColor,
      tipo_eventos: Number(eventCategory.value),
      usuario_id: currentUser.id,
      fecha: selectedDateKey,
      hora_inicio: eventStart.value.trim() || null,
      hora_fin: eventEnd.value.trim() || null,
    }),
  });

  eventName.value = '';
  eventDesc.value = '';
  eventStart.value = '';
  eventEnd.value = '';
  await loadEvents();
}

COLORS.forEach((color) => {
  const chip = document.createElement('div');
  chip.className = 'cswatch' + (color === selectedColor ? ' sel' : '');
  chip.style.background = color;
  chip.addEventListener('click', () => {
    selectedColor = color;
    colorPicker.querySelectorAll('.cswatch').forEach((item) => item.classList.remove('sel'));
    chip.classList.add('sel');
  });
  colorPicker.appendChild(chip);
});

prevBtn.addEventListener('click', () => {
  vm -= 1;
  if (vm < 0) {
    vm = 11;
    vy -= 1;
  }
  renderCalendar();
});

nextBtn.addEventListener('click', () => {
  vm += 1;
  if (vm > 11) {
    vm = 0;
    vy += 1;
  }
  renderCalendar();
});

drawerToggleBtn.addEventListener('click', () => {
  if (upcomingDrawer.classList.contains('open')) {
    closeUpcomingDrawer();
    return;
  }

  openUpcomingDrawer();
});

closeDrawerBtn.addEventListener('click', closeUpcomingDrawer);
drawerOverlay.addEventListener('click', closeUpcomingDrawer);

loginBtn.addEventListener('click', () => {
  if (loginBtn.dataset.loggedIn === 'true') {
    void logout();
    return;
  }

  openAuthModal('login');
});

registerBtn.addEventListener('click', () => {
  if (loginBtn.dataset.loggedIn === 'true') {
    void logout();
    return;
  }

  openAuthModal('register');
});

closeLoginBtn.addEventListener('click', closeLoginModal);
loginModal.addEventListener('click', (event) => {
  if (event.target === loginModal) {
    closeLoginModal();
  }
});

submitLoginBtn.addEventListener('click', () => {
  void authenticate('login').catch((error) => {
    loginStatus.textContent = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
  });
});

submitRegisterBtn.addEventListener('click', () => {
  void authenticate('register').catch((error) => {
    loginStatus.textContent = error instanceof Error ? error.message : 'No se pudo registrar.';
  });
});

loginPassword.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    void authenticate('login').catch((error) => {
      loginStatus.textContent = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
    });
  }
});

addBtn.addEventListener('click', () => {
  void createEvent();
});

renderCalendar();
renderEventsList();
setEventControlsEnabled(false);

restoreSession().catch((error) => {
  console.error(error);
  userStatus.textContent = 'Error al iniciar sesión';
  renderCalendar();
  renderEventsList();
});
