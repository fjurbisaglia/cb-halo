export interface Insurance {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  currency: 'EUR' | 'USD';
  amountCovered: number;
  region: 'Europe' | 'Worldwide' | 'Latin America';
}

export interface CreateInsuranceRequest {
  name: string;
  description: string;
  pricePerDay: number;
  currency: 'EUR' | 'USD';
  amountCovered: number;
  region: 'Europe' | 'Worldwide' | 'Latin America';
}

export interface UpdateInsuranceRequest {
  id: string;
  name?: string;
  description?: string;
  pricePerDay?: number;
  currency?: 'EUR' | 'USD';
  amountCovered?: number;
  region?: 'Europe' | 'Worldwide' | 'Latin America';
}
