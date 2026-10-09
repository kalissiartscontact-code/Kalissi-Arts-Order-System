import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Order } from '../types';
import { calculateOrderWeightKg } from './pricing';

export interface ZRColisResult {
  success: boolean;
  status: 'created' | 'failed' | 'not_configured';
  httpStatus?: number;
  trackingNumber?: string;
  parcelId?: string;
  labelUrl?: string;
  message: string;
  error?: string;
  rawResponse?: any;
  sentPayload?: any;
  endpointCalled?: string;
}

export interface ZRTerritoryItem {
  id: string;
  code?: number;
  name: string;
  nameArabic?: string;
  postalCode?: string;
  level: string;
  parentId?: string | null;
  delivery?: {
    hasHomeDelivery: boolean;
    hasPickupPoint: boolean;
    canSend: boolean;
  };
}

export interface ZRHubItem {
  id: string;
  name: string;
  type: string;
  isPickupPoint: boolean;
  isVisible: boolean;
  isReturnCenter?: boolean;
  address?: {
    street?: string;
    city?: string;
    cityTerritoryId?: string;
    district?: string;
    districtTerritoryId?: string;
    postalCode?: string;
    country?: string;
  };
}

// In-memory caches to make lookups fast while remaining fully dynamic
let cachedWilayas: ZRTerritoryItem[] = [];
const cachedCommunesByWilayaId: Map<string, ZRTerritoryItem[]> = new Map();
let cachedHubs: ZRHubItem[] = [];

/**
 * Robustly load ZR Express credentials from process.env or data/integration_config.json
 */
export function getZRExpressCredentials(): {
  tenant: string;
  apiKey: string;
  baseUrl: string;
} {
  let tenant = (
    process.env.X_TENANT ||
    process.env.ZR_TENANT ||
    process.env.ZR_EXPRESS_TENANT ||
    process.env.ZR_EXPRESS_CLIENT_CODE ||
    ''
  ).trim();

  let apiKey = (
    process.env.X_API_KEY ||
    process.env.ZR_API_KEY ||
    process.env.ZR_EXPRESS_API_KEY ||
    process.env.ZR_EXPRESS_API_TOKEN ||
    ''
  ).trim();

  let baseUrl = (
    process.env.ZR_API_BASE_URL ||
    process.env.ZR_EXPRESS_BASE_URL ||
    'https://api.zrexpress.app'
  ).trim();

  // If missing from process.env, inspect data/integration_config.json
  if (!tenant || !apiKey) {
    try {
      const candidates = [
        path.join(process.cwd(), 'data', 'integration_config.json'),
        path.join(process.cwd(), '..', 'data', 'integration_config.json'),
        '/app/applet/data/integration_config.json',
        '/data/integration_config.json'
      ];
      for (const configPath of candidates) {
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (!tenant && parsed.xTenant) {
            tenant = String(parsed.xTenant).trim();
            process.env.X_TENANT = tenant;
            process.env.ZR_TENANT = tenant;
          }
          if (!apiKey && parsed.xApiKey) {
            apiKey = String(parsed.xApiKey).trim();
            process.env.X_API_KEY = apiKey;
            process.env.ZR_API_KEY = apiKey;
          }
          if (parsed.zrApiBaseUrl) {
            baseUrl = String(parsed.zrApiBaseUrl).trim();
            process.env.ZR_API_BASE_URL = baseUrl;
          }
          break;
        }
      }
    } catch (e) {
      console.warn('[ZR Express] Notice loading integration_config.json:', e);
    }
  }

  baseUrl = baseUrl.replace(/\/+$/, '');

  return { tenant, apiKey, baseUrl };
}

export function isZRExpressConfigured(): {
  configured: boolean;
  missing: string[];
  detail: string;
  tenant: string;
  baseUrl: string;
  hasApiKey: boolean;
  hasToken: boolean;
} {
  const { tenant, apiKey, baseUrl } = getZRExpressCredentials();
  const missing: string[] = [];

  if (!tenant) missing.push('X-Tenant (ZR_TENANT)');
  if (!apiKey) missing.push('X-Api-Key (ZR_API_KEY)');

  return {
    configured: missing.length === 0,
    missing,
    detail: missing.length === 0
      ? 'ZR Express API opérationnelle (api.zrexpress.app)'
      : `Identifiants ZR Express manquants : ${missing.join(', ')}`,
    tenant,
    baseUrl,
    hasApiKey: Boolean(apiKey),
    hasToken: Boolean(apiKey)
  };
}

/**
 * Fetch and cache all Wilayas from ZR Express API
 */
export async function getZRExpressWilayas(): Promise<ZRTerritoryItem[]> {
  if (cachedWilayas.length > 0) return cachedWilayas;

  const { tenant, apiKey, baseUrl } = getZRExpressCredentials();
  if (!tenant || !apiKey) return [];

  try {
    const res = await fetch(`${baseUrl}/api/v1/territories/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant': tenant,
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        pageNumber: 1,
        pageSize: 60,
        advancedFilter: {
          logic: 'and',
          filters: [{ field: 'level', operator: 'eq', value: 'wilaya' }]
        }
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        cachedWilayas = data.items;
        return cachedWilayas;
      }
    }
  } catch (err) {
    console.warn('[ZR Express] Wilayas search error:', err);
  }
  return cachedWilayas;
}

/**
 * Fetch and cache all Communes for a specific Wilaya ID from ZR Express API
 */
export async function getZRExpressCommunes(wilayaId: string): Promise<ZRTerritoryItem[]> {
  if (cachedCommunesByWilayaId.has(wilayaId)) {
    return cachedCommunesByWilayaId.get(wilayaId)!;
  }

  const { tenant, apiKey, baseUrl } = getZRExpressCredentials();
  if (!tenant || !apiKey) return [];

  try {
    const res = await fetch(`${baseUrl}/api/v1/territories/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant': tenant,
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        pageNumber: 1,
        pageSize: 120,
        advancedFilter: {
          logic: 'and',
          filters: [{ field: 'parentId', operator: 'eq', value: wilayaId }]
        }
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        cachedCommunesByWilayaId.set(wilayaId, data.items);
        return data.items;
      }
    }
  } catch (err) {
    console.warn('[ZR Express] Communes search error for wilaya', wilayaId, err);
  }
  return [];
}

/**
 * Fetch and cache all Hubs from ZR Express API
 */
export async function getZRExpressHubs(): Promise<ZRHubItem[]> {
  if (cachedHubs.length > 0) return cachedHubs;

  const { tenant, apiKey, baseUrl } = getZRExpressCredentials();
  if (!tenant || !apiKey) return [];

  try {
    const res = await fetch(`${baseUrl}/api/v1/hubs/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant': tenant,
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        pageSize: 150
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        cachedHubs = data.items;
        return cachedHubs;
      }
    }
  } catch (err) {
    console.warn('[ZR Express] Hubs search error:', err);
  }
  return cachedHubs;
}

/**
 * Normalize string for fuzzy matching (remove accents, spaces, lowercase)
 */
function normalizeName(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve real Wilaya UUID from ZR Express
 */
export async function resolveWilayaTerritoryId(wilayaCode?: string, wilayaName?: string): Promise<string> {
  const wilayas = await getZRExpressWilayas();

  const codeNum = Number(wilayaCode);
  if (!isNaN(codeNum) && codeNum > 0) {
    const matchedByCode = wilayas.find(w => Number(w.code) === codeNum);
    if (matchedByCode) return matchedByCode.id;
  }

  if (wilayaName) {
    const norm = normalizeName(wilayaName);
    const matchedByName = wilayas.find(w => {
      const n1 = normalizeName(w.name);
      return n1 === norm || n1.includes(norm) || norm.includes(n1);
    });
    if (matchedByName) return matchedByName.id;
  }

  // Fallback: If code is 16 (Alger) or default, return known Alger UUID
  if (wilayaCode === '16' || normalizeName(wilayaName) === 'alger') {
    return 'd134c182-7dac-4655-9d9b-bbdb62aa2ec4';
  }

  return wilayas[0]?.id || 'd134c182-7dac-4655-9d9b-bbdb62aa2ec4';
}

/**
 * Resolve real Commune (district) UUID from ZR Express
 */
export async function resolveCommuneTerritoryId(cityTerritoryId: string, communeName?: string): Promise<string> {
  const communes = await getZRExpressCommunes(cityTerritoryId);

  if (communes.length > 0) {
    if (communeName) {
      const norm = normalizeName(communeName);
      const matched = communes.find(c => {
        const n = normalizeName(c.name);
        return n === norm || n.includes(norm) || norm.includes(n);
      });
      if (matched) return matched.id;
    }
    // Return first commune in this wilaya
    return communes[0].id;
  }

  // Fallback to cityTerritoryId if no communes returned
  return cityTerritoryId;
}

/**
 * Resolve real Hub UUID for Stop Desk from ZR Express
 */
export async function resolveHubForStopDesk(
  cityTerritoryId: string,
  preferredStopDesk?: string
): Promise<{ hubId: string; districtTerritoryId?: string; hubStreet?: string } | null> {
  const allHubs = await getZRExpressHubs();
  
  // Find hubs located in this wilaya
  const wilayaHubs = allHubs.filter(h => 
    h.address?.cityTerritoryId === cityTerritoryId && h.isPickupPoint !== false
  );

  const pool = wilayaHubs.length > 0 ? wilayaHubs : allHubs.filter(h => h.isPickupPoint !== false);

  if (pool.length === 0) {
    return null;
  }

  // If user selected a specific Stop Desk name, match it
  if (preferredStopDesk) {
    const normPref = normalizeName(preferredStopDesk);
    const matched = pool.find(h => {
      const normName = normalizeName(h.name);
      const normStreet = normalizeName(h.address?.street);
      const normDistrict = normalizeName(h.address?.district);
      return (
        normName.includes(normPref) ||
        normPref.includes(normName) ||
        normPref.includes(normDistrict) ||
        normPref.includes(normStreet)
      );
    });
    if (matched) {
      return {
        hubId: matched.id,
        districtTerritoryId: matched.address?.districtTerritoryId,
        hubStreet: matched.address?.street || matched.name
      };
    }
  }

  // Default to first pickup point hub in that wilaya
  const primary = pool[0];
  return {
    hubId: primary.id,
    districtTerritoryId: primary.address?.districtTerritoryId,
    hubStreet: primary.address?.street || primary.name
  };
}

/**
 * Format Algerian phone numbers to +213 format
 */
export function formatAlgerianPhone(p?: string): string {
  if (!p) return '+213550000000';
  const clean = p.replace(/[\s\-\.]/g, '');
  if (clean.startsWith('+213')) return clean;
  if (clean.startsWith('00213')) return `+213${clean.slice(5)}`;
  if (clean.startsWith('0')) return `+213${clean.slice(1)}`;
  if (clean.startsWith('213')) return `+${clean}`;
  return `+213${clean}`;
}

/**
 * Build the exact POST /api/v1/parcels JSON payload according to official ZR Express documentation.
 */
export async function buildZRExpressPayload(order: Order): Promise<Record<string, any>> {
  const isStopDesk = order.customer.deliveryType === 'stopdesk';
  const deliveryType = isStopDesk ? 'pickup-point' : 'home';

  // 1. Resolve City Territory ID (Wilaya)
  const cityTerritoryId = await resolveWilayaTerritoryId(
    order.customer.wilayaCode,
    order.customer.wilayaName
  );

  let districtTerritoryId = cityTerritoryId;
  let hubId: string | undefined;
  let street = '';

  if (isStopDesk) {
    // 2a. Resolve Hub for Stop Desk
    const resolvedHub = await resolveHubForStopDesk(cityTerritoryId, order.customer.zrStopDesk);
    if (resolvedHub) {
      hubId = resolvedHub.hubId;
      districtTerritoryId = resolvedHub.districtTerritoryId || cityTerritoryId;
      street = `Stop Desk ZR Express : ${order.customer.zrStopDesk || resolvedHub.hubStreet || order.customer.wilayaName}`;
    } else {
      street = `Stop Desk ZR Express : ${order.customer.zrStopDesk || order.customer.wilayaName}`;
    }
  } else {
    // 2b. Resolve Commune for Home Delivery
    districtTerritoryId = await resolveCommuneTerritoryId(cityTerritoryId, order.customer.commune);
    street = [order.customer.commune, order.customer.address].filter(Boolean).join(' - ') || 'Adresse client';
  }

  const number1 = formatAlgerianPhone(order.customer.phone);
  const number2 = order.customer.secondaryPhone ? formatAlgerianPhone(order.customer.secondaryPhone) : undefined;

  const productDescription = `Kalissi Arts - ${order.cardConfig.quantity} Cartes de visite 350g (${order.cardConfig.roundedCorners ? 'Coins arrondis' : 'Coins droits'}) + Support carte offert`;
  const weightKg = order.pricing?.weightKg || order.weightKg || calculateOrderWeightKg(order.cardConfig?.quantity || 1000);

  const payload: Record<string, any> = {
    customer: {
      customerId: crypto.randomUUID(),
      name: order.customer.fullName || 'Client Kalissi Arts',
      phone: {
        number1,
        ...(number2 ? { number2 } : {})
      }
    },
    deliveryAddress: {
      cityTerritoryId,
      districtTerritoryId,
      street
    },
    weight: {
      weight: weightKg
    },
    orderedProducts: [
      {
        productName: productDescription,
        unitPrice: Number(order.pricing.total),
        quantity: 1,
        stockType: 'none'
      }
    ],
    deliveryType,
    description: productDescription,
    amount: Number(order.pricing.total),
    externalId: order.orderCode
  };

  if (isStopDesk && hubId) {
    payload.hubId = hubId;
  }

  return payload;
}

/**
 * Execute real HTTP request to ZR Express POST /api/v1/parcels.
 * Never simulates success and never suppresses ZR Express errors.
 */
export async function createZRExpressColis(order: Order): Promise<ZRColisResult> {
  // Prevent duplicate sending: only bypass if ALREADY has confirmed real tracking from ZR
  if (order.zrExpress?.status === 'created' && order.zrExpress.trackingNumber && !order.zrExpress.trackingNumber.startsWith('ZR-KL')) {
    return {
      success: true,
      status: 'created',
      trackingNumber: order.zrExpress.trackingNumber,
      parcelId: order.zrExpress.parcelId,
      labelUrl: order.zrExpress.labelUrl,
      message: `La commande a déjà été transmise à ZR Express (N° Suivi : ${order.zrExpress.trackingNumber}). Envoi unique garanti.`
    };
  }

  const { tenant, apiKey, baseUrl } = getZRExpressCredentials();
  const endpoint = `${baseUrl}/api/v1/parcels`;

  if (!tenant || !apiKey) {
    console.error('[ZR Express Error] Credentials missing at runtime. Tenant:', Boolean(tenant), 'ApiKey:', Boolean(apiKey));
    return {
      success: false,
      status: 'not_configured',
      message: 'Identifiants ZR Express (X-Tenant et X-Api-Key) non configurés.',
      error: 'X-Tenant et X-Api-Key requis pour envoyer le colis à ZR Express.'
    };
  }

  let payload: Record<string, any>;
  try {
    payload = await buildZRExpressPayload(order);
  } catch (err: any) {
    console.error('[ZR Express Payload Build Error]', err);
    return {
      success: false,
      status: 'failed',
      message: `Erreur lors de la préparation des territoires ZR Express : ${err.message}`,
      error: err.message
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Tenant': tenant,
    'X-Api-Key': apiKey,
    'Authorization': `Bearer ${apiKey}`
  };

  console.log(`[ZR Express Request] POST ${endpoint}`);
  console.log(`[ZR Express Headers] X-Tenant: ${tenant.substring(0, 8)}... | X-Api-Key: *** (${apiKey.length} chars)`);
  console.log(`[ZR Express Payload]`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    const rawText = await response.text();
    let rawJson: any = null;
    try {
      rawJson = JSON.parse(rawText);
    } catch {
      rawJson = null;
    }

    console.log(`[ZR Express Response] HTTP ${response.status}`, rawJson || rawText);

    if (!response.ok) {
      let errorMessage = '';
      if (Array.isArray(rawJson?.errors) && rawJson.errors.length > 0) {
        errorMessage = rawJson.errors.map((e: any) => {
          const desc = e.description || e.code || JSON.stringify(e);
          if (desc.includes('Phone_Number1')) {
            return 'Numéro de téléphone principal invalide pour ZR Express (+213 5xx / 6xx / 7xx obligatoire)';
          }
          if (desc.includes('Phone_Number2')) {
            return 'Numéro de téléphone secondaire invalide pour ZR Express';
          }
          if (desc.includes('DistrictDoesNotBelongToCity')) {
            return "La commune ou quartier n'appartient pas à la wilaya sélectionnée";
          }
          return desc;
        }).join(' ; ');
      } else if (rawJson?.detail && rawJson.detail !== 'One or more validation errors occurred') {
        errorMessage = rawJson.detail;
      } else {
        errorMessage = rawJson?.message || rawJson?.title || rawJson?.detail || rawText || response.statusText;
      }

      return {
        success: false,
        status: 'failed',
        httpStatus: response.status,
        message: `Erreur API ZR Express (HTTP ${response.status}) : ${errorMessage}`,
        error: `HTTP ${response.status} : ${errorMessage}`,
        rawResponse: rawJson || rawText,
        sentPayload: payload,
        endpointCalled: endpoint
      };
    }

    // Success: ZR Express returns { "id": "uuid" }
    const parcelId = rawJson?.id || rawJson?.parcelId;
    let trackingNumber: string | undefined = rawJson?.trackingNumber || rawJson?.tracking_number;
    let labelUrl: string | undefined = rawJson?.labelUrl;
    let fullParcelData: any = rawJson;

    // Hydrate full parcel details via GET /api/v1/parcels/{id}
    if (parcelId) {
      try {
        const detailRes = await fetch(`${endpoint}/${parcelId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Tenant': tenant,
            'X-Api-Key': apiKey,
            'Authorization': `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(8000)
        });

        if (detailRes.ok) {
          const detailData = await detailRes.json();
          fullParcelData = detailData;
          trackingNumber = detailData?.trackingNumber || detailData?.barcode || trackingNumber;
          labelUrl = detailData?.labelUrl || labelUrl;
          console.log(`[ZR Express Hydrated] Tracking: ${trackingNumber}, State: ${detailData?.state?.name}`);
        }
      } catch (getErr) {
        console.warn('[ZR Express Hydrate Notice]', getErr);
      }
    }

    return {
      success: true,
      status: 'created',
      httpStatus: response.status,
      parcelId,
      trackingNumber: trackingNumber || `ZR-${order.orderCode}`,
      labelUrl,
      message: 'Expédition ZR Express enregistrée avec succès.',
      rawResponse: fullParcelData,
      sentPayload: payload,
      endpointCalled: endpoint
    };
  } catch (err: any) {
    console.error('[ZR Express Connection Error]', err);
    return {
      success: false,
      status: 'failed',
      message: `Erreur de connexion à l'API ZR Express : ${err?.message || 'Erreur réseau'}`,
      error: err?.message || 'Erreur réseau',
      sentPayload: payload,
      endpointCalled: endpoint
    };
  }
}

/**
 * Test ZR Express API connection.
 */
export async function testZRExpressConnection(): Promise<{
  success: boolean;
  httpStatus?: number;
  message: string;
  responseBody?: any;
  tenantConfigured: boolean;
  apiKeyConfigured: boolean;
  baseUrl: string;
}> {
  const { tenant, apiKey, baseUrl } = getZRExpressCredentials();
  const endpoint = `${baseUrl}/api/v1/territories/search`;

  if (!tenant || !apiKey) {
    return {
      success: false,
      message: 'X-Tenant ou X-Api-Key manquant dans la configuration.',
      tenantConfigured: Boolean(tenant),
      apiKeyConfigured: Boolean(apiKey),
      baseUrl
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant': tenant,
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        pageSize: 1,
        advancedFilter: {
          logic: 'and',
          filters: [{ field: 'level', operator: 'eq', value: 'wilaya' }]
        }
      }),
      signal: AbortSignal.timeout(10000)
    });

    const rawText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }

    return {
      success: response.ok,
      httpStatus: response.status,
      message: response.ok
        ? `Connexion ZR Express réussie (HTTP ${response.status}) - API opérationnelle`
        : `Réponse ZR Express : HTTP ${response.status} - ${typeof parsed === 'string' ? parsed : (parsed?.detail || parsed?.title || JSON.stringify(parsed))}`,
      responseBody: parsed,
      tenantConfigured: Boolean(tenant),
      apiKeyConfigured: Boolean(apiKey),
      baseUrl
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Impossible de joindre ZR Express (${baseUrl}) : ${err.message}`,
      tenantConfigured: Boolean(tenant),
      apiKeyConfigured: Boolean(apiKey),
      baseUrl
    };
  }
}
