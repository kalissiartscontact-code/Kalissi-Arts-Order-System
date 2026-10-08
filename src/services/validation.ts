import { CustomerInfo, CardOrderConfig } from '../types';
import { getCardBasePrice } from '../data/pricing';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Normalizes phone numbers by stripping whitespace, hyphens, and brackets.
 */
export function normalizeAlgerianPhone(phoneStr?: string): string {
  if (!phoneStr) return '';
  let cleaned = phoneStr.trim().replace(/[\s\-\.\(\)\/]/g, '');
  if (cleaned.startsWith('+213')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('00213')) {
    cleaned = '0' + cleaned.substring(5);
  } else if (cleaned.startsWith('213')) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
}

/**
 * Strict Phone Validation:
 * - REQUIRED
 * - Must contain ONLY digits (no letters, signs, or spaces)
 * - Must contain EXACTLY 10 digits
 * - Must start ONLY with: 05, 06, or 07
 */
export function validatePhoneNumber(phoneStr?: string): { isValid: boolean; error?: string } {
  if (!phoneStr || typeof phoneStr !== 'string' || !phoneStr.trim()) {
    return {
      isValid: false,
      error: "Le numéro de téléphone est obligatoire."
    };
  }

  const clean = phoneStr.trim();

  // 1. Must contain ONLY digits
  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      error: "Le numéro doit contenir uniquement des chiffres."
    };
  }

  // 2. Prefix validation: Must start ONLY with 05, 06, or 07
  if (clean.length === 1) {
    if (clean !== '0') {
      return {
        isValid: false,
        error: "Le numéro doit commencer par 05, 06 ou 07."
      };
    }
  } else if (clean.length >= 2) {
    const prefix = clean.substring(0, 2);
    if (prefix !== '05' && prefix !== '06' && prefix !== '07') {
      return {
        isValid: false,
        error: "Le numéro doit commencer par 05, 06 ou 07."
      };
    }
  }

  // 3. Exact 10 digits validation
  if (clean.length < 10) {
    return {
      isValid: false,
      error: "Le numéro doit contenir 10 chiffres."
    };
  }

  if (clean.length > 10) {
    return {
      isValid: false,
      error: "Le numéro doit contenir 10 chiffres."
    };
  }

  // 4. Validate Algerian mobile operator blocks (ARPCE / E.164 compliance)
  if (clean.startsWith('05')) {
    const p3 = clean.substring(0, 3);
    const p4 = clean.substring(0, 4);
    const isValid05 = p3 === '054' || p3 === '055' || ['0560', '0561', '0562', '0563'].includes(p4);
    if (!isValid05) {
      return {
        isValid: false,
        error: "Numéro Ooredoo (05) invalide. Préfixes valides : 054, 055 ou 0560-0563."
      };
    }
  } else if (clean.startsWith('06')) {
    const p3 = clean.substring(0, 3);
    if (!['065', '066', '067', '069'].includes(p3)) {
      return {
        isValid: false,
        error: "Numéro Mobilis (06) invalide. Préfixes valides : 065, 066, 067, 069."
      };
    }
  } else if (clean.startsWith('07')) {
    const p3 = clean.substring(0, 3);
    if (!['077', '078', '079'].includes(p3)) {
      return {
        isValid: false,
        error: "Numéro Djezzy (07) invalide. Préfixes valides : 077, 078, 079."
      };
    }
  }

  return { isValid: true };
}

/**
 * Returns true if and only if phone is a valid 10-digit Algerian mobile number.
 */
export function isValidPrimaryAlgerianPhone(phoneStr?: string): boolean {
  if (!phoneStr) return false;
  return validatePhoneNumber(phoneStr).isValid;
}

/**
 * Strict Order Validation (used identically in Frontend and Backend):
 * Ensures no required field can be bypassed.
 */
export function validateBusinessCardOrder(
  customer: Partial<CustomerInfo>,
  cardConfig: Partial<CardOrderConfig>
): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Nom du client (Required)
  const fullName = customer.fullName?.trim();
  if (!fullName || fullName.length === 0) {
    errors.fullName = "Le nom complet du client est obligatoire / الإسم الكامل إجباري.";
  } else if (fullName.length < 2) {
    errors.fullName = "Le nom doit comporter au moins 2 caractères.";
  }

  // 2. Numéro de téléphone (Required, strict 10 digits, starts with 05/06/07)
  const phoneValidation = validatePhoneNumber(customer.phone);
  if (!phoneValidation.isValid && phoneValidation.error) {
    errors.phone = phoneValidation.error;
  }

  // 3. Type de produit (Required)
  const product = (cardConfig as any)?.product || (cardConfig as any)?.productName || 'Carte de visite / بطاقة زيارة';
  if (!product || typeof product !== 'string' || !product.trim()) {
    errors.product = "Le type de produit est obligatoire / نوع المنتج إجباري.";
  }

  // 4. Quantité (Required)
  const qty = Number(cardConfig.quantity);
  if (!qty || isNaN(qty) || qty <= 0) {
    errors.quantity = "La quantité d'exemplaires est obligatoire / الكمية إجبارية.";
  } else if (qty < 1000 || qty > 36000 || qty % 1000 !== 0) {
    errors.quantity = "La quantité doit être comprise entre 1 000 et 36 000 cartes (par multiple de 1 000) / الكمية يجب أن تكون بين 1000 و 36000 بطاقة.";
  } else {
    // Check if price is defined
    const basePrice = getCardBasePrice(qty);
    if (basePrice === null) {
      errors.quantity = `Le tarif pour ${qty.toLocaleString('fr-DZ')} cartes doit être défini dans Google Sheets (table PRICING).`;
    }
  }

  // 5. Type de livraison (Required: stopdesk ou domicile)
  if (!customer.deliveryType || (customer.deliveryType !== 'stopdesk' && customer.deliveryType !== 'domicile')) {
    errors.deliveryType = "Le type de livraison est obligatoire (Stop Desk ou À domicile) / نوع التوصيل إجباري.";
  }

  // 6. Wilaya (Required: non vide)
  const wilayaCode = customer.wilayaCode?.trim();
  if (!wilayaCode || wilayaCode === '' || wilayaCode === 'undefined') {
    errors.wilayaCode = "La wilaya de livraison est obligatoire / يرجى اختيار الولاية.";
  }

  // 7. Commune & Adresse si À domicile (Required)
  if (customer.deliveryType === 'domicile') {
    if (!customer.commune || !customer.commune.trim()) {
      errors.commune = "La commune est obligatoire pour la livraison à domicile / يرجى اختيار البلدية.";
    }
    if (!customer.address || !customer.address.trim()) {
      errors.address = "L'adresse complète de livraison est obligatoire pour la livraison à domicile / يرجى إدخال عنوان التوصيل.";
    }
  }

  // 8. Bureau ZR Express si Stop Desk (Required)
  if (customer.deliveryType === 'stopdesk') {
    if (!customer.zrStopDesk || !customer.zrStopDesk.trim()) {
      errors.zrStopDesk = "Veuillez sélectionner le bureau ZR Express Stop Desk / يرجى اختيار مكتب التوصيل ZR Express.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
