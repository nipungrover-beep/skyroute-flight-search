const FARE_TIERS = [
  {
    id: 'saver',
    name: 'Saver',
    priceMultiplier: 1.0,
    baggageKg: 15,
    meal: false,
    freeCancellation: false,
    freeDateChange: false,
    freeSeatSelection: false,
  },
  {
    id: 'flexi',
    name: 'Flexi',
    priceMultiplier: 1.12,
    baggageKg: 20,
    meal: true,
    freeCancellation: false,
    freeDateChange: true,
    freeSeatSelection: false,
  },
  {
    id: 'flexi-plus',
    name: 'Flexi Plus',
    priceMultiplier: 1.25,
    baggageKg: 25,
    meal: true,
    freeCancellation: true,
    freeDateChange: true,
    freeSeatSelection: true,
  },
];

export function computeFares(basePrice) {
  return FARE_TIERS.map((tier) => ({
    id: tier.id,
    name: tier.name,
    price: Math.round(basePrice * tier.priceMultiplier),
    baggageKg: tier.baggageKg,
    meal: tier.meal,
    freeCancellation: tier.freeCancellation,
    freeDateChange: tier.freeDateChange,
    freeSeatSelection: tier.freeSeatSelection,
  }));
}
