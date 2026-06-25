# CALIDAD.md

## Equipo

- Martín Iván Biosca
- Teo González Rozenberg

Repositorio: https://github.com/Martooooooo/TpFront2  
URL de producción: https://tp-front2.vercel.app/

---

## Estrategia general

Nuestra estrategia de calidad se basó en tres pilares: **tests automatizados**, **integración continua** y **flujo de trabajo ordenado en GitHub**.

La metodología que usamos durante el desarrollo fue **Extreme Programming (XP)**, lo cual influyó directamente en cómo encaramos la calidad: trabajo en pareja, revisión constante del código entre los dos integrantes, y entregas frecuentes en lugar de acumular cambios grandes.

El enfoque que elegimos fue proteger primero la **lógica de negocio pura** (funciones que no dependen del DOM ni de la base de datos) con tests unitarios, y luego cubrir el **flujo principal del usuario** con un test end-to-end. Esto nos permite detectar errores tanto en funciones individuales como en la experiencia completa de uso.

Decidimos no buscar cobertura del 100% porque consideramos que es más valioso tener tests que prueben comportamiento real que inflar un número con tests triviales. Priorizamos los casos que, si fallan, rompen la app para el usuario.

---

## Herramientas seleccionadas

### Tests unitarios: Vitest

Elegimos **Vitest** en lugar de Jest porque está diseñado específicamente para proyectos que usan Vite (que es la base de Astro). Tiene una configuración mínima, sintaxis idéntica a Jest, y corre significativamente más rápido en proyectos TypeScript. Con Jest hubiéramos necesitado configuración extra para manejar módulos ESM, que es el formato que usa nuestro proyecto.

### Tests E2E: Playwright

Elegimos **Playwright** por sobre Cypress porque tiene soporte nativo para múltiples navegadores, funciona bien en entornos CI sin configuración adicional, y su API es más moderna. Para nuestro caso de uso (verificar que el calendario carga y el login funciona) ambas herramientas serían equivalentes, pero Playwright tiene mejor integración con TypeScript.

### Linting: ESLint

Configuramos **ESLint** con las reglas recomendadas de JavaScript para detectar errores básicos de código (variables no usadas, llamadas incorrectas, etc.) antes de que lleguen a producción. No usamos reglas de estilo estrictas porque consideramos que agregarían fricción innecesaria sin mejorar la calidad real del código.

### CI/CD: GitHub Actions

Elegimos **GitHub Actions** porque está integrado directamente en el repositorio, sin necesidad de configurar un servicio externo. El archivo `.github/workflows/ci.yml` define el pipeline completo y corre automáticamente en cada push o PR a `main`.

### Deploy: Vercel

El deploy a producción lo maneja **Vercel** directamente conectado al repositorio. Cada push a `main` que pasa el pipeline de CI dispara un deploy automático. Elegimos Vercel porque ya lo teníamos configurado del TP2 y tiene integración nativa con Astro.

---

## Tests desarrollados

### Tests unitarios (Vitest) — `src/lib/calendarUtils.test.ts`

| Test | Qué valida |
|------|-----------|
| `getKey` — formatea con ceros a la izquierda | Que `getKey(2025, 1, 5)` devuelva `"2025-01-05"` correctamente |
| `getKey` — no agrega cero innecesario | Que `getKey(2025, 12, 31)` devuelva `"2025-12-31"` sin alterar valores de dos dígitos |
| `normalizeDateKey` — recorta fecha con hora | Que `"2025-06-15T10:30:00"` se reduzca a `"2025-06-15"` |
| `normalizeDateKey` — maneja null | Que no rompa y devuelva string vacío cuando recibe `null` |
| `normalizeDateKey` — maneja undefined | Que no rompa y devuelva string vacío cuando recibe `undefined` |
| `groupEvents` — agrupa mismo día | Que dos eventos con la misma fecha queden en la misma clave del objeto |
| `groupEvents` — separa días distintos | Que eventos de fechas diferentes queden en claves separadas |
| `groupEvents` — array vacío | Que devuelva un objeto vacío sin errores |
| `getUpcomingEvents` — filtra y ordena futuros | Que solo devuelva eventos futuros y en orden cronológico |
| `getUpcomingEvents` — respeta límite | Que con `limit = 3` devuelva exactamente 3 eventos |

### Tests E2E (Playwright) — `e2e/calendar.spec.ts`

| Test | Qué valida |
|------|-----------|
| Usuario no autenticado ve el calendario pero no puede agregar eventos | Que el calendario carga, el botón "agregar" está deshabilitado sin sesión, y se muestra el mensaje "Iniciá sesión" |
| Usuario puede abrir el modal de login | Que al hacer click en "Iniciar sesión" aparece el modal con los campos de usuario y contraseña |

---

## Casos de uso críticos

Priorizamos proteger estos flujos por sobre otros:

**1. Generación y normalización de claves de fecha (`getKey`, `normalizeDateKey`)**  
Son la base de toda la lógica del calendario. Si `getKey` genera una clave mal formateada, los eventos no se muestran en el día correcto. Si `normalizeDateKey` no recorta correctamente las fechas que vienen de la base de datos (que incluyen timestamp), todos los eventos quedan sin agrupar. Un bug acá rompe la funcionalidad principal de la app silenciosamente.

**2. Agrupación de eventos por fecha (`groupEvents`)**  
Esta función transforma la lista plana de eventos que devuelve la API en el objeto que usa el calendario para renderizar. Si falla, el calendario aparece vacío aunque haya eventos en la base de datos.

**3. Filtrado de eventos próximos (`getUpcomingEvents`)**  
Determina qué eventos aparecen en el drawer lateral. Es importante que solo muestre eventos futuros y en el orden correcto.

**4. Carga inicial y acceso sin sesión (E2E)**  
El flujo más básico: que la app cargue y que un usuario no autenticado vea el estado correcto (calendario visible, controles deshabilitados). Si esto falla, ningún usuario puede usar la app.

No priorizamos testear la autenticación completa (login real con credenciales) porque requiere una base de datos de prueba separada, lo cual excedía el alcance del TP.

---

## Pipeline de CI/CD

El pipeline está definido en `.github/workflows/ci.yml` y se dispara en cada push o PR a `main`.

### Pasos del workflow

1. **Checkout del código** — descarga el repositorio en el runner de GitHub
2. **Instalar Node.js 22** — versión que coincide con la requerida en `engines` del `package.json`
3. **Instalar dependencias** — corre `npm install` dentro de `calendar_serverless`
4. **Correr tests unitarios** — ejecuta `npm test` (Vitest), que corre los 10 tests unitarios
5. **Instalar Playwright** — instala el navegador Chromium necesario para los tests E2E
6. **Correr tests E2E** — ejecuta `npm run test:e2e` (Playwright)
7. **Build** — ejecuta `npm run build` para verificar que el proyecto compila correctamente

### Decisiones de diseño

- **El deploy no está en el pipeline:** Vercel se conecta directamente al repositorio y hace deploy automático cuando detecta un push a `main`. Esto evita duplicar la lógica de deploy y mantiene el pipeline simple.
- **Si los tests fallan, el build no corre:** Los pasos son secuenciales, por lo que un fallo en cualquier paso detiene la ejecución. Esto garantiza que nunca se haga build de código con tests rotos.
- **Los tests E2E corren en CI con servidor local:** Playwright levanta el servidor de desarrollo automáticamente gracias a la configuración `webServer` en `playwright.config.ts`.
- **`working-directory: calendar_serverless`:** Todos los comandos se ejecutan dentro de la subcarpeta del proyecto, ya que el repositorio tiene una estructura con carpeta raíz separada.

---

## Limitaciones y deuda técnica

**Tests E2E sin base de datos real:**  
Los tests E2E actuales solo verifican comportamiento del frontend sin sesión iniciada. No testeamos el flujo completo de login → crear evento → ver evento porque requeriría una base de datos de prueba separada (distinta a la de producción). Esto es un riesgo consciente: si la API de autenticación cambia, no lo vamos a detectar automáticamente.

**Sin tests para los endpoints de la API:**  
Los archivos en `src/pages/api/` (auth, events) no tienen tests. Testearlos requeriría mockear la conexión a Neon o tener una base de datos de prueba. Con más tiempo implementaríamos tests de integración para estos endpoints.

**ESLint con reglas mínimas:**  
Configuramos ESLint con las reglas recomendadas básicas de JavaScript, pero no agregamos reglas específicas para TypeScript (`@typescript-eslint`). Esto significa que algunos errores de tipos no son detectados por el linter.

**Sin cobertura de código medida:**  
No configuramos `vitest --coverage` para generar un reporte de cobertura. Con más tiempo lo agregaríamos al pipeline para tener una métrica objetiva de qué porcentaje de la lógica está cubierta.

**Tests E2E solo en Chromium:**  
Por simplicidad y tiempo de ejecución en CI, configuramos Playwright para correr solo en Chromium. En un proyecto real también correríamos en Firefox y Safari.