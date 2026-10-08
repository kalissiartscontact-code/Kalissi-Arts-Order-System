import crypto from 'crypto';
import { Order, CustomerInfo, CardOrderConfig, DuplicateCheckResult } from '../types';
import { normalizeAlgerianPhone } from './validation';

// 8-character unique order code generator (alphanumeric, uppercase, human-readable)
// Excludes confusing chars (0, O, 1, I, L)
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generate8CharOrderCode(): string {
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

// Generates a one-time secure order token (UUIDv4/crypto hex)
export function generateOneTimeSecureToken(): string {
  return `tok_${Date.now().toString(36)}_${crypto.randomBytes(16).toString('hex')}`;
}

// Fingerprint for duplicate order detection:
// primary phone + wilaya + deliveryType + destination (commune/stopdesk) + quantity + roundedCorners + total
export function generateCardOrderFingerprint(
  customer: CustomerInfo,
  cardConfig: CardOrderConfig,
  totalDA: number
): string {
  const normPhone = normalizeAlgerianPhone(customer.phone);
  const wilaya = customer.wilayaCode;
  const deliveryType = customer.deliveryType;
  const destination = (deliveryType === 'domicile' ? customer.commune : customer.zrStopDesk) || '';
  const qty = cardConfig.quantity;
  const corners = cardConfig.roundedCorners ? 'R1' : 'R0';

  return `${normPhone}#${wilaya}#${deliveryType}#${destination.toLowerCase().trim()}#${qty}#${corners}#${totalDA}`;
}

export const DUPLICATE_TIME_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export function checkCardOrderDuplicate(
  existingOrders: Order[],
  newCustomer: CustomerInfo,
  newCardConfig: CardOrderConfig,
  newTotalDA: number
): DuplicateCheckResult {
  const newFingerprint = generateCardOrderFingerprint(newCustomer, newCardConfig, newTotalDA);
  const normalizedNewPhone = normalizeAlgerianPhone(newCustomer.phone);
  const now = Date.now();

  for (const order of existingOrders) {
    if (order.status === 'cancelled') continue;

    const orderTime = new Date(order.createdAt).getTime();
    const ageMs = now - orderTime;

    if (ageMs < DUPLICATE_TIME_WINDOW_MS) {
      const minutesAgo = Math.max(1, Math.round(ageMs / 60000));

      // Rule 1: Exact duplicate order (same phone, wilaya, delivery, quantity, corners, total)
      if (order.fingerprint === newFingerprint) {
        return {
          isDuplicate: true,
          reason: `Commande identique détectée pour le numéro ${newCustomer.phone}. Une commande (${order.orderCode}) avec la même quantité (${order.cardConfig.quantity} cartes) a déjà été enregistrée il y a ${minutesAgo} minute(s). Pour éviter un double tirage et double expédition ZR Express, cette commande est protégée.`,
          existingOrderId: order.id,
          existingOrderCode: order.orderCode,
          minutesAgo
        };
      }

      // Rule 2: Rapid resubmission from same primary phone within 2 minutes
      const existingPhone = normalizeAlgerianPhone(order.customer.phone);
      if (existingPhone === normalizedNewPhone && ageMs < 2 * 60 * 1000) {
        return {
          isDuplicate: true,
          reason: `Soumission rapide détectée pour le numéro ${newCustomer.phone}. La commande ${order.orderCode} a été soumise il y a moins de 2 minutes. Veuillez patienter pour le traitement d'impression.`,
          existingOrderId: order.id,
          existingOrderCode: order.orderCode,
          minutesAgo
        };
      }
    }
  }

  return { isDuplicate: false };
}
