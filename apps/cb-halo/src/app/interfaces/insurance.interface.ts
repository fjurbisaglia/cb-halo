export interface Insurance {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  currency: 'EUR' | 'USD';
  amountCovered: number;
  region: 'Europe' | 'Worldwide' | 'Latin America';
}
