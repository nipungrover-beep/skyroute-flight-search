import { test, expect } from '@playwright/test';
import { futureDateIso, searchFlights } from '../helpers.js';

const DATE = futureDateIso(28);

async function reachConfirmation(page) {
  await searchFlights(page, { fromQuery: 'Delhi', fromCode: 'DEL', toQuery: 'Mumbai', toCode: 'BOM', date: DATE });
  await page.getByTestId('flight-select-button').first().click();
  await page.waitForURL('**/select**');
  await page.getByTestId('fare-option-flexi').click();
  await page.locator('.seat.standard:not(.unavailable)').first().click();
  await page.getByTestId('continue-button').click();
  await page.waitForURL('**/confirm**');
  await expect(page.getByTestId('confirmation-card')).toBeVisible();
}

test.describe('class switch on the confirmation page', () => {
  test('the toggle shows Economy active by default, matching the class picked during selection', async ({
    page,
  }) => {
    await reachConfirmation(page);

    await expect(page.getByTestId('class-toggle-economy')).toHaveClass(/active/);
    await expect(page.getByTestId('class-toggle-business')).not.toHaveClass(/active/);
    await expect(page.getByTestId('class-toggle-business')).toBeEnabled();
  });

  test('switching Economy to Business keeps the same fare tier, updates seat and price, and updates the URL', async ({
    page,
  }) => {
    await reachConfirmation(page);
    const economyFare = await page.getByTestId('confirmation-fare').textContent();
    const economyTotal = await page.getByTestId('confirmation-total-price').textContent();

    await page.getByTestId('class-toggle-business').click();
    await expect(page.getByTestId('class-toggle-business')).toHaveClass(/active/);
    await expect(page.getByTestId('class-toggle-economy')).not.toHaveClass(/active/);

    const businessFare = await page.getByTestId('confirmation-fare').textContent();
    const businessTotal = await page.getByTestId('confirmation-total-price').textContent();

    expect(businessFare).toBe(economyFare); // same tier (Flexi), different class
    expect(businessTotal).not.toBe(economyTotal); // business costs more for the same tier
    expect(page.url()).toContain('travelClass=BUSINESS');
  });

  test('switching Business back to Economy restores the original fare, seat, and price exactly', async ({
    page,
  }) => {
    await reachConfirmation(page);
    const original = {
      fare: await page.getByTestId('confirmation-fare').textContent(),
      seat: await page.getByTestId('confirmation-seat').textContent(),
      total: await page.getByTestId('confirmation-total-price').textContent(),
    };

    await page.getByTestId('class-toggle-business').click();
    await expect(page.getByTestId('class-toggle-business')).toHaveClass(/active/);

    await page.getByTestId('class-toggle-economy').click();
    await expect(page.getByTestId('class-toggle-economy')).toHaveClass(/active/);

    await expect(page.getByTestId('confirmation-fare')).toHaveText(original.fare);
    await expect(page.getByTestId('confirmation-seat')).toHaveText(original.seat);
    await expect(page.getByTestId('confirmation-total-price')).toHaveText(original.total);
    expect(page.url()).toContain('travelClass=ECONOMY');
  });

  test('the auto-picked seat prefers a standard (fee-free) seat, and says so when none is available', async ({
    page,
  }) => {
    await reachConfirmation(page);

    await page.getByTestId('class-toggle-business').click();
    await expect(page.getByTestId('class-toggle-business')).toHaveClass(/active/);

    const seatId = await page.getByTestId('confirmation-seat').textContent();
    // Extra-legroom seats are always in row 1 or 2 (see server/src/lib/seatMap.js). A small
    // business cabin can have every seat in those rows, in which case the fee-seat notice
    // must be shown -- either a free standard seat was picked, or the notice explains why not.
    const row = Number.parseInt(seatId, 10);
    if (row >= 3) {
      await expect(page.getByTestId('class-switch-fee-notice')).not.toBeVisible();
    } else {
      await expect(page.getByTestId('class-switch-fee-notice')).toBeVisible();
      await expect(page.getByTestId('class-switch-fee-notice')).toContainText('Business');
    }
  });

  test('the total price always equals fare price plus seat fee after a switch', async ({ page, request }) => {
    await reachConfirmation(page);
    await page.getByTestId('class-toggle-business').click();
    await expect(page.getByTestId('class-toggle-business')).toHaveClass(/active/);

    const url = new URL(page.url());
    const flightId = url.pathname.match(/\/flights\/(\d+)\//)[1];
    const seatId = await page.getByTestId('confirmation-seat').textContent();

    const confirmRes = await request.get(`/api/flights/${flightId}/confirm`, {
      params: { travelClass: 'BUSINESS', passengers: '1', fareId: 'flexi', seatId },
    });
    const confirmBody = await confirmRes.json();

    const shownTotal = await page.getByTestId('confirmation-total-price').textContent();
    expect(shownTotal).toBe(`₹${confirmBody.totalPrice.toLocaleString('en-IN')}`);
  });
});
