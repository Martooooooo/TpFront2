import { test, expect } from '@playwright/test';

test('usuario no autenticado ve el calendario pero no puede agregar eventos', async ({ page }) => {
  await page.goto('/');

  // El calendario carga correctamente
  await expect(page.locator('#cal')).toBeVisible();

  // El botón de agregar evento está deshabilitado sin sesión
  const addBtn = page.locator('#add-btn');
  await expect(addBtn).toBeDisabled();

  // Se muestra mensaje pidiendo iniciar sesión
  await expect(page.locator('#events-list')).toContainText('Iniciá sesión');
});

test('usuario puede abrir el modal de login', async ({ page }) => {
  await page.goto('/');

  // Click en "Iniciar sesión"
  await page.locator('#login-btn').click();

  // El modal aparece
  await expect(page.locator('#login-modal')).toBeVisible();

  // Tiene los campos de usuario y contraseña
  await expect(page.locator('#login-name')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
});