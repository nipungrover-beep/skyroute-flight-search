function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const mm = String(wrapped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// [flightNumber, airline, from, to, departTime, durationMinutes, stops, priceEconomy, priceBusiness, seatsEconomy, seatsBusiness]
const raw = [
  ['6E 2031', 'IndiGo', 'DEL', 'BOM', '06:00', 130, 0, 4899, 12999, 42, 8],
  ['AI 665', 'Air India', 'DEL', 'BOM', '09:15', 135, 0, 5299, 14499, 30, 6],
  ['UK 927', 'Vistara', 'DEL', 'BOM', '18:40', 130, 0, 6199, 15999, 24, 10],
  ['6E 2032', 'IndiGo', 'BOM', 'DEL', '07:10', 130, 0, 4799, 12799, 40, 8],
  ['AI 666', 'Air India', 'BOM', 'DEL', '14:20', 135, 0, 5399, 14299, 28, 6],
  ['SG 145', 'SpiceJet', 'BOM', 'DEL', '20:05', 140, 0, 4599, 13499, 33, 4],

  ['6E 5301', 'IndiGo', 'DEL', 'BLR', '05:45', 165, 0, 5399, 13999, 36, 8],
  ['UK 811', 'Vistara', 'DEL', 'BLR', '11:30', 170, 1, 4999, 13499, 30, 6],
  ['QP 1402', 'Akasa Air', 'DEL', 'BLR', '19:00', 165, 0, 5899, 14999, 25, 8],
  ['6E 5302', 'IndiGo', 'BLR', 'DEL', '08:00', 165, 0, 5299, 13799, 34, 8],
  ['AI 503', 'Air India', 'BLR', 'DEL', '13:45', 175, 1, 4899, 13299, 29, 6],
  ['UK 812', 'Vistara', 'BLR', 'DEL', '21:15', 165, 0, 6099, 15499, 22, 10],

  ['AI 441', 'Air India', 'DEL', 'MAA', '07:20', 165, 0, 5599, 14299, 32, 8],
  ['6E 6091', 'IndiGo', 'DEL', 'MAA', '16:10', 175, 1, 4999, 13699, 38, 6],
  ['6E 6092', 'IndiGo', 'MAA', 'DEL', '10:05', 165, 0, 5199, 13999, 35, 6],
  ['SG 221', 'SpiceJet', 'MAA', 'DEL', '17:50', 180, 1, 4699, 13199, 27, 4],

  ['6E 6501', 'IndiGo', 'DEL', 'CCU', '06:30', 130, 0, 4999, 13299, 40, 6],
  ['AI 771', 'Air India', 'DEL', 'CCU', '15:00', 140, 1, 4599, 12999, 30, 6],
  ['6E 6502', 'IndiGo', 'CCU', 'DEL', '09:00', 130, 0, 5099, 13399, 37, 6],
  ['UK 771', 'Vistara', 'CCU', 'DEL', '18:15', 130, 0, 5799, 14799, 26, 8],

  ['6E 763', 'IndiGo', 'BOM', 'BLR', '06:15', 95, 0, 3899, 10999, 44, 8],
  ['UK 955', 'Vistara', 'BOM', 'BLR', '12:40', 100, 0, 4299, 11499, 28, 6],
  ['QP 1701', 'Akasa Air', 'BOM', 'BLR', '19:30', 95, 0, 3699, 10499, 33, 8],
  ['6E 764', 'IndiGo', 'BLR', 'BOM', '08:20', 95, 0, 3999, 10799, 41, 8],
  ['AI 631', 'Air India', 'BLR', 'BOM', '17:05', 105, 0, 4499, 11799, 25, 6],

  ['6E 6111', 'IndiGo', 'BOM', 'GOI', '07:45', 75, 0, 3299, 9299, 45, 6],
  ['SG 411', 'SpiceJet', 'BOM', 'GOI', '14:10', 80, 0, 2999, 8799, 30, 4],
  ['6E 6112', 'IndiGo', 'GOI', 'BOM', '10:30', 75, 0, 3399, 9399, 42, 6],
  ['QP 1188', 'Akasa Air', 'GOI', 'BOM', '18:50', 75, 0, 3199, 8999, 34, 6],

  ['6E 7201', 'IndiGo', 'BLR', 'HYD', '06:50', 70, 0, 2799, 7999, 46, 6],
  ['UK 833', 'Vistara', 'BLR', 'HYD', '13:20', 75, 0, 3099, 8399, 27, 6],
  ['6E 7202', 'IndiGo', 'HYD', 'BLR', '09:40', 70, 0, 2899, 8099, 43, 6],
  ['AI 511', 'Air India', 'HYD', 'BLR', '19:10', 75, 0, 3199, 8499, 24, 4],

  ['6E 5051', 'IndiGo', 'BOM', 'PNQ', '07:00', 45, 0, 1899, 5999, 50, 6],
  ['QP 1305', 'Akasa Air', 'BOM', 'PNQ', '16:30', 45, 0, 1799, 5799, 38, 6],
  ['6E 5052', 'IndiGo', 'PNQ', 'BOM', '09:15', 45, 0, 1949, 6099, 47, 6],
  ['6E 5053', 'IndiGo', 'PNQ', 'BOM', '18:45', 45, 0, 1699, 5599, 40, 6],

  ['6E 2301', 'IndiGo', 'DEL', 'JAI', '08:10', 60, 0, 2199, 6499, 48, 6],
  ['SG 601', 'SpiceJet', 'DEL', 'JAI', '17:30', 60, 0, 1999, 6199, 35, 4],
  ['6E 2302', 'IndiGo', 'JAI', 'DEL', '10:20', 60, 0, 2249, 6599, 44, 6],
  ['6E 2303', 'IndiGo', 'JAI', 'DEL', '19:40', 60, 0, 2099, 6299, 39, 6],

  ['6E 8801', 'IndiGo', 'MAA', 'COK', '07:30', 70, 0, 2599, 7599, 41, 6],
  ['IX 384', 'Air India Express', 'MAA', 'COK', '15:45', 75, 0, 2399, 7299, 32, 4],
  ['6E 8802', 'IndiGo', 'COK', 'MAA', '09:50', 70, 0, 2699, 7699, 39, 6],
  ['UK 941', 'Vistara', 'COK', 'MAA', '18:20', 75, 0, 2999, 7999, 23, 6],

  ['AI 991', 'Air India', 'DEL', 'AMD', '06:40', 100, 0, 3799, 10299, 34, 6],
  ['6E 3401', 'IndiGo', 'DEL', 'AMD', '14:55', 105, 0, 3599, 9999, 42, 6],
  ['6E 3402', 'IndiGo', 'AMD', 'DEL', '09:05', 100, 0, 3699, 10199, 40, 6],
  ['UK 621', 'Vistara', 'AMD', 'DEL', '20:10', 105, 0, 4099, 10799, 25, 8],

  ['6E 7601', 'IndiGo', 'HYD', 'CCU', '08:35', 110, 0, 3999, 10999, 37, 6],
  ['AI 441', 'Air India', 'HYD', 'CCU', '16:20', 120, 1, 3699, 10499, 28, 4],
  ['6E 7602', 'IndiGo', 'CCU', 'HYD', '11:00', 110, 0, 4099, 11099, 35, 6],

  ['6E 2701', 'IndiGo', 'DEL', 'IXC', '07:25', 55, 0, 1799, 5499, 46, 6],
  ['6E 2702', 'IndiGo', 'IXC', 'DEL', '09:35', 55, 0, 1849, 5599, 44, 6],
  ['SG 705', 'SpiceJet', 'IXC', 'DEL', '18:05', 55, 0, 1699, 5299, 36, 4],
];

export const flights = raw.map(
  ([
    flightNumber,
    airline,
    from,
    to,
    departTime,
    durationMinutes,
    stops,
    priceEconomy,
    priceBusiness,
    seatsEconomy,
    seatsBusiness,
  ]) => ({
    flightNumber,
    airline,
    from,
    to,
    departTime,
    arriveTime: addMinutes(departTime, durationMinutes),
    durationMinutes,
    stops,
    priceEconomy,
    priceBusiness,
    seatsEconomy,
    seatsBusiness,
  })
);
