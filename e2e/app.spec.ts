import { test, expect } from '@playwright/test';

test('schedule renders fixtures and groups by day', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brand-name')).toHaveText('World Cup 2026');
  // Match cards render once the (fallback) snapshot loads.
  await expect(page.locator('.mc').first()).toBeVisible();
  await expect(page.locator('.day-block').first()).toBeVisible();
});

test('stage filter narrows the list', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Final' }).click();
  // The Final stage shows only the final (1 card) at MetLife Stadium.
  await expect(page.locator('.mc')).toHaveCount(1);
  await expect(page.getByText(/MetLife/).first()).toBeVisible();
});

test('match drawer opens with details and closes on Escape', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.locator('.mc').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('timezone selector updates the header label', async ({ page }) => {
  await page.goto('/');
  // Wait for the island to hydrate (cards rendered) before interacting.
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.getByLabel('Select timezone').selectOption('Asia/Tokyo');
  await expect(page.locator('#tz-label')).toHaveText('Tokyo');
});

test('primary navigation reaches every section', async ({ page }) => {
  await page.goto('/');
  for (const [name, heading] of [
    ['Tables', 'Group Standings'],
    ['Scorers', 'Golden Boot Race'],
    ['Bracket', 'Knockout Bracket'],
    ['News', 'World Cup News'],
  ] as const) {
    await page.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('favoriting a team from the drawer enables the Favorites filter', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.locator('.mc').first().click();
  await page.getByRole('button', { name: /Follow / }).first().click();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: '★ Favorites' }).click();
  await expect(page.locator('.mc.fav').first()).toBeVisible();
});

test('support button opens the donation modal and validates input', async ({ page }) => {
  await page.goto('/');
  const supportBtn = page.getByRole('button', { name: /Support this project/ });
  await expect(supportBtn).toBeVisible();
  await supportBtn.click();

  const dialog = page.getByRole('dialog', { name: 'Support this project' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Buy me a coffee/)).toBeVisible();

  const cta = dialog.getByRole('button', { name: /Donate securely/ });
  await expect(cta).toBeDisabled(); // no email/amount yet

  await dialog.getByLabel(/Your email/).fill('fan@example.com');
  await dialog.getByRole('button', { name: /1,000/ }).click();
  await expect(cta).toBeEnabled();

  // Close without triggering a real payment (Paystack SDK never loads).
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
