async function request(path) {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function searchAirports(query) {
  const params = new URLSearchParams({ q: query });
  return request(`/api/airports?${params.toString()}`);
}

export function searchFlights(criteria) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(criteria).filter(([, v]) => v !== undefined && v !== ''))
  );
  return request(`/api/flights?${params.toString()}`);
}

export function getFares(flightId, travelClass) {
  const params = new URLSearchParams({ travelClass });
  return request(`/api/flights/${flightId}/fares?${params.toString()}`);
}

export function getSeatMap(flightId, travelClass) {
  const params = new URLSearchParams({ travelClass });
  return request(`/api/flights/${flightId}/seatmap?${params.toString()}`);
}

export function confirmSelection(flightId, { travelClass, passengers, fareId, seatId }) {
  const params = new URLSearchParams({ travelClass, passengers: String(passengers), fareId, seatId });
  return request(`/api/flights/${flightId}/confirm?${params.toString()}`);
}
