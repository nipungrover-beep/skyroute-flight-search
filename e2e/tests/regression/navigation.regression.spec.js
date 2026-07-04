import { test, expect } from '@playwright/test';
import { futureDateIso, pickAirport } from '../helpers.js';

test.describe('navigation', () => {
  test('a deep link directly to /results renders without visiting the home page first', async ({ page }) => {
    const date = futureDateIso(18);
    const params = new URLSearchParams({
      from: 'DEL',
      fromCity: 'Delhi',
      to: 'BOM',
      toCity: 'Mumbai',
      date,
      passengers: '1',
      travelClass: 'ECONOMY',
    });

    await page.goto(`/results?${params.toString()}`);

    await expect(page.getByTestId('flight-card')).toHaveCount(3);
    await expect(page.getByTestId('from-input')).toHaveValue('Delhi (DEL)');
    await expect(page.getByTestId('to-input')).toHaveValue('Mumbai (BOM)');
  });

  test('browser back after a new search from the results page restores the previous search', async ({ page }) => {
    const date = futureDateIso(18);

    await page.goto('/');
    await pickAirport(page, 'from', 'Delhi', 'DEL');
    await pickAirport(page, 'to', 'Mumbai', 'BOM');
    await page.getByTestId('date-input').fill(date);
    await page.getByTestId('search-submit-button').click();
    await page.waitForURL('**/results**');
    await expect(page.getByTestId('flight-card')).toHaveCount(3);

    // Run a second search from the compact form on the results page itself.
    await pickAirport(page, 'from', 'Bengaluru', 'BLR');
    await pickAirport(page, 'to', 'Hyderabad', 'HYD');
    await page.getByTestId('search-submit-button').click();
    await expect(page.getByTestId('flight-number').first()).toHaveText(/6E 7201|UK 833/);

    await page.goBack();

    await expect(page.getByTestId('from-input')).toHaveValue('Delhi (DEL)');
    await expect(page.getByTestId('to-input')).toHaveValue('Mumbai (BOM)');
    await expect(page.getByTestId('flight-card')).toHaveCount(3);
  });
});
