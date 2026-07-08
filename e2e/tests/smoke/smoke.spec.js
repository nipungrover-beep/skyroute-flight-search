import { test, expect } from '@playwright/test';
import { futureDateIso, pickAirport } from '../helpers.js';

test.describe('smoke', () => {
  test('[E2E-SMK-001] home page loads with a usable search form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('search-form')).toBeVisible();
    await expect(page.getByTestId('from-input')).toBeVisible();
    await expect(page.getByTestId('to-input')).toBeVisible();
    await expect(page.getByTestId('search-submit-button')).toBeVisible();
  });

  test('[E2E-SMK-002] a basic search returns results without errors', async ({ page }) => {
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

  test('[E2E-SMK-003] backend API is reachable through the app', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('[E2E-SMK-004] can select a fare and seat and reach a confirmation', async ({ page }) => {
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

    await page.getByTestId('flight-select-button').first().click();
    await page.waitForURL('**/select**');
    await expect(page.getByTestId('fare-list')).toBeVisible();

    await page.getByTestId('fare-option-saver').click();
    await page.locator('.seat:not(.unavailable)').first().click();
    await page.getByTestId('continue-button').click();

    await page.waitForURL('**/confirm**');
    await expect(page.getByTestId('confirmation-card')).toBeVisible();

    expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('; ')}`).toEqual([]);
  });
});
