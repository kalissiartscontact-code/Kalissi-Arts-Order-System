export type DeliveryType = 'domicile' | 'stopdesk';

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'in_production'
  | 'shipped_zr'
  | 'delivered'
  | 'cancelled'
  | 'duplicate_blocked';

export interface CardPricingTier {
  quantity: number;
  basePrice: number; // DA
  label: string;
  popular?: boolean;
  savings?: string;
  hasExplicitPrice?: boolean;
  isFromSheets?: boolean;
}

export interface CustomerInfo {
  fullName: string; // required
  phone: string; // required: exactly 10 digits starting with 05/06/07
  secondaryPhone?: string; // optional
  wilayaCode: string; // required
  wilayaName: string;
  deliveryType: DeliveryType;
  commune?: string; // required only for À domicile
  zrStopDesk?: string; // required only for Stop Desk
  address?: string; // required for À domicile
  orderNotes?: string;
}

export interface CardOrderConfig {
  product?: string; // Type de produit, e.g. "Carte de visite / بطاقة زيارة"
  quantity: number; // 1000 to 36000
  roundedCorners: boolean; // +500 DA for every 1000 cards
  freeCardHolderGift: boolean; // Support carte offert (حامل بطاقات هدية) GRATUIT — مجاني
  cardholderColor?: string;
  cardName?: string;
  cardActivity?: string;
  cardEmail?: string;
}

export interface PricingBreakdown {
  quantity: number;
  cardsBasePrice: number; // DA
  roundedCornersFee: number; // DA (+500 DA for every 1000 cards)
  freeGiftIncluded: boolean; // Support carte offert (حامل بطاقات هدية) — GRATUIT — مجاني
  subtotal: number;
  shippingFee: number; // from WILAYAS based on domicile vs stopdesk + internal extra weight fee
  baseShippingFee?: number;
  weightKg?: number; // Internal calculated parcel weight
  extraWeightFee?: number; // Internal extra delivery fee for weight above 5 kg (+25 DA per 500g)
  total: number; // TOTAL À PAYER in DA
  isPricePendingSheets?: boolean; // true if quantity >= 10000 and not yet provided in Google Sheets PRICING
}

export type OrderChannel = 'whatsapp' | 'messenger';

export interface Order {
  id: string;
  orderCode: string; // Unique 8-character code, e.g. KL7X9B2W
  orderToken: string; // One-time secure order token
  createdAt: string;
  customer: CustomerInfo;
  cardConfig: CardOrderConfig;
  pricing: PricingBreakdown;
  weightKg?: number;
  channel?: OrderChannel;
  status: OrderStatus;
  fingerprint: string;
  ipAddress?: string;
  isDuplicateFlagged: boolean;
  duplicateReason?: string;
  googleSheetsSync?: {
    status: 'pending' | 'synced' | 'failed' | 'not_configured';
    syncedAt?: string;
    error?: string;
  };
  zrExpress: {
    status: 'pending' | 'created' | 'failed' | 'not_configured';
    trackingNumber?: string;
    parcelId?: string;
    labelUrl?: string;
    weightKg?: number;
    createdAt?: string;
    error?: string;
    latestEvent?: string;
    httpStatus?: number;
    rawResponse?: any;
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  existingOrderId?: string;
  existingOrderCode?: string;
  minutesAgo?: number;
}

export interface IntegrationStatus {
  googleSheets?: {
    configured: boolean;
    type: 'webhook' | 'service_account' | 'api' | 'none';
    detail?: string;
    spreadsheetId?: string;
    webhookUrlMasked?: string;
    webhookUrl?: string;
  };
  zrExpress: {
    configured: boolean;
    detail?: string;
    missing?: string[];
    hasApiKey: boolean;
    hasToken: boolean;
    clientCode?: string;
    baseUrl: string;
  };
}
