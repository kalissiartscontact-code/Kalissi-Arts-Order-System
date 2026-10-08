import { PricingBreakdown, CustomerInfo, CardOrderConfig } from '../types';
import { getWilayaByCode } from '../data/wilayas';
import { getCardBasePrice, ROUNDED_CORNERS_RATE_PER_THOUSAND } from '../data/pricing';

/**
 * Internal delivery weight calculation:
 * - 1,000 cards = 1.7 kg
 * - 2,000 cards = 3.4 kg
 * Continues using the configured quantity/weight relationship.
 */
export function calculateOrderWeightKg(quantity: number): number {
  const q = Math.max(1000, quantity || 1000);
  return Number(((q / 1000) * 1.7).toFixed(2));
}

/**
 * Internal delivery-weight additional fee calculation:
 * - The delivery price already includes the first 5 kg.
 * - Only weight ABOVE 5 kg generates an additional fee.
 * - Every additional 500 g = +25 DA.
 * 
 * Examples:
 * 5.0 kg → +0 DA
 * 5.1 kg → +0 DA
 * 5.4 kg → +0 DA
 * 5.5 kg → +25 DA
 * 5.9 kg → +25 DA
 * 6.0 kg → +50 DA
 * 6.4 kg → +50 DA
 * 6.5 kg → +75 DA
 * 7.0 kg → +100 DA
 * 10.0 kg → +250 DA
 */
export function calculateExtraWeightFee(weightKg: number): number {
  const excessGrams = Math.max(0, Math.round(weightKg * 1000) - 5000);
  const excess500gUnits = Math.floor(excessGrams / 500);
  return excess500gUnits * 25;
}

export function calculateCardOrderPricing(
  cardConfig: CardOrderConfig,
  customer: Partial<CustomerInfo>
): PricingBreakdown {
  const quantity = Math.max(1000, cardConfig.quantity || 1000);
  const thousands = Math.round(quantity / 1000);

  // Cards base price: Exact specification (1000-9000) or read from Google Sheets PRICING (10000-36000)
  const basePriceOrNull = getCardBasePrice(quantity);
  const isPricePendingSheets = basePriceOrNull === null;
  const cardsBasePrice = basePriceOrNull ?? 0;

  // Rounded corners: +500 DA for every 1000 cards
  const roundedCornersFee = cardConfig.roundedCorners
    ? thousands * ROUNDED_CORNERS_RATE_PER_THOUSAND
    : 0;

  const subtotal = cardsBasePrice + roundedCornersFee;

  // Base delivery fee from WILAYAS
  let baseShippingFee = 0;
  if (customer.wilayaCode) {
    const wilaya = getWilayaByCode(customer.wilayaCode);
    if (wilaya) {
      if (customer.deliveryType === 'stopdesk') {
        baseShippingFee = wilaya.stopdeskDeliveryFee;
      } else {
        // default to domicile
        baseShippingFee = wilaya.homeDeliveryFee;
      }
    } else {
      baseShippingFee = customer.deliveryType === 'stopdesk' ? 400 : 600;
    }
  }

  // Internal weight and additional delivery fee
  const weightKg = calculateOrderWeightKg(quantity);
  const extraWeightFee = calculateExtraWeightFee(weightKg);

  // The delivery price includes the first 5 kg (base) + extra fee for weight above 5 kg
  const shippingFee = baseShippingFee > 0 ? (baseShippingFee + extraWeightFee) : 0;

  // TOTAL À PAYER = cards price + rounded corners + delivery
  const total = subtotal + shippingFee;

  return {
    quantity,
    cardsBasePrice,
    roundedCornersFee,
    freeGiftIncluded: true, // Support carte offert (حامل بطاقات هدية) — GRATUIT — مجاني
    subtotal,
    shippingFee,
    baseShippingFee,
    weightKg,
    extraWeightFee,
    total,
    isPricePendingSheets
  };
}

export function formatDA(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(amount) + ' DA';
}
