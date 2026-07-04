import { test, expect } from '@playwright/test';
import { futureDateIso, searchFlights } from '../helpers.js';

test.describe('empty results', () => {
  test('a route with no scheduled flights shows the no-results message', async ({ page }) => {
    const date = futureDateIso(12);
    await searchFlights(page, { fromQuery: 'Goa', fromCode: 'GOI', toQuery: 'Chandigarh', toCode: 'IXC', date });

    await expect(page.getByTestId('no-results-message')).toBeVisible();
    await expect(page.getByTestId('no-results-message')).toContainText('Goa');
    await expect(page.getByTestId('no-results-message')).toContainText('Chandigarh');
    await expect(page.getByTestId('flight-card')).toHaveCount(0);
    await expect(page.getByTestId('results-count')).toHaveText('0 flights found');
  });

  test('filtering an existing result set down to zero also shows the no-results message', async ({ page }) => {
    const date = futureDateIso(12);
    // DEL -> BLR: only one nonstop-and-IndiGo flight exists; combining a filter
    // that excludes it should collapse the list to zero without erroring.
    await searchFlights(page, { fromQuery: 'Delhi', fromCode: 'DEL', toQuery: 'Bengaluru', toCode: 'BLR', date });
    await expect(page.getByTestId('flight-card')).toHaveCount(3);

    await page.getByTestId('filter-airline-Vistara').check();
    await page.getByTestId('filter-stops-nonstop').check();

    await expect(page.getByTestId('no-results-message')).toBeVisible();
    await expect(page.getByTestId('flight-card')).toHaveCount(0);
  });
});
