import { test, expect } from '@playwright/test';
import { futureDateIso, pickAirport } from '../helpers.js';

test.describe('smoke', () => {
  test('home page loads with a usable search form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('search-form')).toBeVisible();
    await expect(page.getByTestId('from-input')).toBeVisible();
    await expect(page.getByTestId('to-input')).toBeVisible();
    await expect(page.getByTestId('search-submit-button')).toBeVisible();
  });

  test('a basic search returns results without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto('/');
    await pickAirport(page, 'from', 'Delhi', 'DEL');
    await pickAirport(page, 'to', 'Mumbai', 'BOM');
    await page.getByTestId('date-input').fill(futureDateIso(21));
    await page.getByTestId('search-submit-button').click();

    await page.waitForURL('**/results**');
    await expect(page.getByTestId('results-list')).toBeVisible();
    await expect(page.getByTestId('flight-card').first()).toBeVisible();

    expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('; ')}`).toEqual([]);
  });

  test('backend API is reachable through the app', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
