import { test, expect } from '@playwright/test';
import { futureDateIso, searchFlights } from '../helpers.js';

// DEL -> BLR seed data (3 flights, mixed airlines/stops/times):
//   UK 811  Vistara    11:30  170min  1 stop    ECONOMY 4999
//   6E 5301 IndiGo      05:45  165min  nonstop   ECONOMY 5399
//   QP 1402 Akasa Air   19:00  165min  nonstop   ECONOMY 5899
const DATE = futureDateIso(20);

async function goToResults(page) {
  await searchFlights(page, { fromQuery: 'Delhi', fromCode: 'DEL', toQuery: 'Bengaluru', toCode: 'BLR', date: DATE });
  await expect(page.getByTestId('flight-card')).toHaveCount(3);
}

test.describe('filters and sorting', () => {
  test('[E2E-REG-006] results are sorted by price ascending by default', async ({ page }) => {
    await goToResults(page);
    const prices = await page.getByTestId('flight-price').allTextContents();
    expect(prices).toEqual(['₹4,999', '₹5,399', '₹5,899']);
  });

  test('[E2E-REG-007] sorting by departure time reorders the list earliest-first', async ({ page }) => {
    await goToResults(page);
    await page.getByTestId('sort-select').selectOption('departure');
    const numbers = await page.getByTestId('flight-number').allTextContents();
    expect(numbers).toEqual(['6E 5301', 'UK 811', 'QP 1402']);
  });

  test('[E2E-REG-008] sorting by duration puts the longest flight last', async ({ page }) => {
    await goToResults(page);
    await page.getByTestId('sort-select').selectOption('duration');
    const numbers = await page.getByTestId('flight-number').allTextContents();
    expect(numbers[2]).toBe('UK 811'); // the only 1-stop, longest (170min) flight
  });

  test('[E2E-REG-009] nonstop filter removes the 1-stop flight', async ({ page }) => {
    await goToResults(page);
    await page.getByTestId('filter-stops-nonstop').check();

    await expect(page.getByTestId('flight-card')).toHaveCount(2);
    const numbers = await page.getByTestId('flight-number').allTextContents();
    expect(numbers).not.toContain('UK 811');
  });

  test('[E2E-REG-010] airline filter narrows results to the selected carrier', async ({ page }) => {
    await goToResults(page);
    await page.getByTestId('filter-airline-IndiGo').check();

    await expect(page.getByTestId('flight-card')).toHaveCount(1);
    await expect(page.getByTestId('flight-number')).toHaveText('6E 5301');
  });

  test('[E2E-REG-011] departure-time filter narrows to flights in that window', async ({ page }) => {
    await goToResults(page);
    await page.getByTestId('filter-departure-early-morning').check();

    await expect(page.getByTestId('flight-card')).toHaveCount(1);
    await expect(page.getByTestId('flight-number')).toHaveText('6E 5301');
  });

  test('[E2E-REG-012] max-price filter excludes flights priced above the threshold', async ({ page }) => {
    await goToResults(page);

    const slider = page.getByTestId('filter-price-max');
    // input[type=range] isn't supported by locator.fill(). Setting el.value directly
    // doesn't reach React's onChange either -- React overrides the native value setter
    // to detect programmatic changes, so bypass it via the native prototype setter.
    await slider.evaluate((el) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, '5000');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(page.getByTestId('flight-card')).toHaveCount(1);
    await expect(page.getByTestId('flight-price')).toHaveText('₹4,999');
  });

  test('[E2E-REG-013] results count reflects the currently filtered list', async ({ page }) => {
    await goToResults(page);
    await expect(page.getByTestId('results-count')).toHaveText('3 flights found');

    await page.getByTestId('filter-stops-nonstop').check();
    await expect(page.getByTestId('results-count')).toHaveText('2 flights found');
  });
});
