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
