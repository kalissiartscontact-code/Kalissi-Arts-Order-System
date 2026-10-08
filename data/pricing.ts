import { CardPricingTier } from '../types';

/**
 * KALISSI ARTS — BUSINESS CARD ORDER SYSTEM (بطاقة زيارة)
 *
 * SPECIFICATION EXACT PRICES:
 * 1000 = 3600 DA
 * 2000 = 6400 DA
 * 3000 = 9600 DA
 * 4000 = 12500 DA
 * 5000 = 15500 DA
 * 6000 = 18600 DA
 * 7000 = 21700 DA
 * 8000 = 24800 DA
 * 9000 = 27900 DA
 *
 * For 10000–36000:
 * DO NOT invent prices. Read them ONLY from PRICING / Google Sheets.
 *
 * Rounded corners:
 * +500 DA for every 1000 cards.
 */

export const EXACT_BUSINESS_CARD_PRICES: Record<number, number> = {
  1000: 3600,
  2000: 6400,
  3000: 9600,
  4000: 12500,
  5000: 15500,
  6000: 18600,
  7000: 21700,
  8000: 24800,
  9000: 27900,
};

// Rounded corners: +500 DA for every 1000 cards
export const ROUNDED_CORNERS_RATE_PER_THOUSAND = 500;

// All standard quantity options from 1000 to 36000
export const ALL_CARD_QUANTITIES = [
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
  10000, 12000, 15000, 20000, 25000, 30000, 36000
];

/**
 * Returns exact price in DA, or null if quantity is 10000-36000 and not yet configured.
 * Strictly adheres to rule: DO NOT invent prices.
 */
export function getCardBasePrice(quantity: number): number | null {
  // Quantities 1000-9000: Exact specification prices
  if (EXACT_BUSINESS_CARD_PRICES[quantity] !== undefined) {
    return EXACT_BUSINESS_CARD_PRICES[quantity];
  }
  return null;
}

export function buildPricingTiers(): CardPricingTier[] {
  return ALL_CARD_QUANTITIES.map((qty) => {
    const basePrice = getCardBasePrice(qty);
    return {
      quantity: qty,
      basePrice: basePrice ?? 0,
      hasExplicitPrice: basePrice !== null,
      isFromSheets: false,
      label: `${qty.toLocaleString('fr-DZ')} cartes`,
      popular: qty === 2000 || qty === 5000,
      savings: qty === 2000 ? "Populaire" : qty === 5000 ? "Offre Pro" : undefined
    };
  });
}

export const BUSINESS_CARD_PRICING: CardPricingTier[] = buildPricingTiers();
