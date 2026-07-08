import { test, expect } from '@playwright/test';
import { futureDateIso, pickAirport, searchFlights } from '../helpers.js';

test.describe('search flow', () => {
  test('[E2E-REG-001] autocomplete suggests and selects an airport by city name', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('from-input').fill('Bengaluru');
    const option = page.getByTestId('from-option-BLR');
    await expect(option).toBeVisible();
    await expect(option).toContainText('Bengaluru');
    await option.click();
    await expect(page.getByTestId('from-input')).toHaveValue('Bengaluru (BLR)');
  });

  test('[E2E-REG-002] swap button exchanges origin and destination', async ({ page }) => {
    await page.goto('/');
    await pickAirport(page, 'from', 'Delhi', 'DEL');
    await pickAirport(page, 'to', 'Mumbai', 'BOM');

    await page.getByTestId('swap-button').click();

    await expect(page.getByTestId('from-input')).toHaveValue('Mumbai (BOM)');
    await expect(page.getByTestId('to-input')).toHaveValue('Delhi (DEL)');
  });

  test('[E2E-REG-003] rejects searching with the same origin and destination', async ({ page }) => {
    await page.goto('/');
    await pickAirport(page, 'from', 'Delhi', 'DEL');
    await pickAirport(page, 'to', 'Delhi', 'DEL');
    await page.getByTestId('date-input').fill(futureDateIso(10));

    await page.getByTestId('search-submit-button').click();

    await expect(page.getByTestId('search-form-error')).toContainText(/cannot be the same/i);
    await expect(page).not.toHaveURL(/\/results/);
  });

  test('[E2E-REG-004] rejects submitting without a departure date', async ({ page }) => {
    await page.goto('/');
    await pickAirport(page, 'from', 'Delhi', 'DEL');
    await pickAirport(page, 'to', 'Mumbai', 'BOM');

    await page.getByTestId('search-submit-button').click();

    await expect(page.getByTestId('search-form-error')).toContainText(/departure date/i);
  });

  test('[E2E-REG-005] a successful search navigates to /results with matching query params and flight cards', async ({
    page,
  }) => {
    const date = futureDateIso(15);
    await searchFlights(page, { fromQuery: 'Delhi', fromCode: 'DEL', toQuery: 'Mumbai', toCode: 'BOM', date });

    await expect(page).toHaveURL(/\/results\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('from')).toBe('DEL');
    expect(url.searchParams.get('to')).toBe('BOM');
    expect(url.searchParams.get('date')).toBe(date);

    await expect(page.getByTestId('results-count')).toContainText('flights found');
    await expect(page.getByTestId('flight-card')).toHaveCount(3);
  });
});
