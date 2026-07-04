export function futureDateIso(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export async function pickAirport(page, fieldTestId, query, airportCode) {
  await page.getByTestId(`${fieldTestId}-input`).fill(query);
  const option = page.getByTestId(`${fieldTestId}-option-${airportCode}`);
  await option.waitFor({ state: 'visible' });
  await option.click();
}

export async function searchFlights(page, { fromQuery, fromCode, toQuery, toCode, date }) {
  await page.goto('/');
  await pickAirport(page, 'from', fromQuery, fromCode);
  await pickAirport(page, 'to', toQuery, toCode);
  await page.getByTestId('date-input').fill(date);
  await page.getByTestId('search-submit-button').click();
  await page.waitForURL('**/results**');
}
