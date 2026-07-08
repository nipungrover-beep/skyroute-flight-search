import { test, expect } from '@playwright/test';
import { futureDateIso, searchFlights } from '../helpers.js';

const DATE = futureDateIso(25);

// DEL -> BOM seed data, sorted by price ascending by default:
//   6E 2031  IndiGo  ECONOMY base price 4899 (cheapest, shown first)

async function goToFirstFlightSelection(page) {
  await searchFlights(page, { fromQuery: 'Delhi', fromCode: 'DEL', toQuery: 'Mumbai', toCode: 'BOM', date: DATE });
  await page.getByTestId('flight-select-button').first().click();
  await page.waitForURL('**/select**');
  await expect(page.getByTestId('fare-list')).toBeVisible();
}

test.describe('fare and seat selection', () => {
  test('[E2E-REG-018] selection page shows three fare tiers and a seat map', async ({ page }) => {
    await goToFirstFlightSelection(page);

    await expect(page.getByTestId('fare-option-saver')).toBeVisible();
    await expect(page.getByTestId('fare-option-flexi')).toBeVisible();
    await expect(page.getByTestId('fare-option-flexi-plus')).toBeVisible();
    await expect(page.getByTestId('seat-map')).toBeVisible();
  });

  test('[E2E-REG-019] selecting the saver fare shows the base price before any seat is chosen', async ({ page }) => {
    await goToFirstFlightSelection(page);

    await page.getByTestId('fare-option-saver').click();

    await expect(page.getByTestId('selection-summary')).toContainText('Saver');
    await expect(page.getByTestId('selection-summary')).toContainText('₹4,899');
  });

  test('[E2E-REG-020] continue is disabled until both a fare and a seat are chosen', async ({ page }) => {
    await goToFirstFlightSelection(page);
    const continueButton = page.getByTestId('continue-button');

    await expect(continueButton).toBeDisabled();

    await page.getByTestId('fare-option-saver').click();
    await expect(continueButton).toBeDisabled();

    await page.locator('.seat:not(.unavailable)').first().click();
    await expect(continueButton).toBeEnabled();
  });

  test('[E2E-REG-021] an unavailable seat cannot be selected', async ({ page }) => {
    await goToFirstFlightSelection(page);

    const unavailableSeat = page.locator('.seat.unavailable').first();
    await expect(unavailableSeat).toBeVisible();
    await expect(unavailableSeat).toBeDisabled();
  });

  test('[E2E-REG-022] confirming a selection shows the matching fare, seat, and total on the confirmation page', async ({
    page,
  }) => {
    await goToFirstFlightSelection(page);

    await page.getByTestId('fare-option-saver').click();

    const standardSeat = page.locator('.seat.standard:not(.unavailable)').first();
    const seatId = (await standardSeat.getAttribute('data-testid')).replace('seat-', '');
    await standardSeat.click();

    await page.getByTestId('continue-button').click();
    await page.waitForURL('**/confirm**');

    await expect(page.getByTestId('confirmation-card')).toBeVisible();
    await expect(page.getByTestId('confirmation-fare')).toHaveText('Saver');
    await expect(page.getByTestId('confirmation-seat')).toHaveText(seatId);
    await expect(page.getByTestId('confirmation-total-price')).toHaveText('₹4,899');
  });

  test('[E2E-REG-023] a deep link directly to the selection page renders without visiting results first', async ({
    page,
    request,
  }) => {
    const search = await request.get('/api/flights', { params: { from: 'DEL', to: 'BOM', date: DATE } });
    const { flights } = await search.json();
    const flightId = flights[0].id;

    const params = new URLSearchParams({
      travelClass: 'ECONOMY',
      passengers: '1',
      from: 'DEL',
      fromCity: 'Delhi',
      to: 'BOM',
      toCity: 'Mumbai',
      date: DATE,
      flightNumber: flights[0].flightNumber,
      airline: flights[0].airline,
      departTime: flights[0].departTime,
      arriveTime: flights[0].arriveTime,
    });

    await page.goto(`/flights/${flightId}/select?${params.toString()}`);

    await expect(page.getByTestId('fare-list')).toBeVisible();
    await expect(page.getByTestId('seat-map')).toBeVisible();
  });
});
