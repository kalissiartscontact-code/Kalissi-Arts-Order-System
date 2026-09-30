import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Order, CustomerInfo, CardOrderConfig } from './src/types';
import { validateBusinessCardOrder } from './src/services/validation';
import { calculateCardOrderPricing } from './src/services/pricing';
import {
  checkCardOrderDuplicate,
  generateCardOrderFingerprint,
  generate8CharOrderCode,
  generateOneTimeSecureToken
} from './src/services/duplicateDetection';
import {
  createZRExpressColis,
  isZRExpressConfigured,
  getZRExpressCredentials,
  testZRExpressConnection
} from './src/services/zrExpress';
import { ALGERIAN_WILAYAS } from './src/data/wilayas';
import {
  EXACT_BUSINESS_CARD_PRICES,
  buildPricingTiers
} from './src/data/pricing';
import {
  checkOrderRateLimit,
  recordOrderAttempt,
  verifyTurnstileToken,
  logSecurityEvent,
  maskIp
} from './src/services/security';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// Dedicated endpoint to upload and save the Kalissi Arts logo static asset
app.post('/api/upload-logo', (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Missing base64Data' });
    }
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const targetFile = filename || 'photo-de-page.jpg';
    const publicPath = path.join(__dirname, 'public', targetFile);
    fs.writeFileSync(publicPath, buffer);
    console.log(`Successfully saved ${targetFile} to public directory (${buffer.length} bytes)`);
    return res.json({ success: true, filename: targetFile, size: buffer.length });
  } catch (err: any) {
    console.error('Error saving logo asset:', err);
    return res.status(500).json({ error: err.message });
  }
});

// In-Memory Orders Buffer:
// Strictly kept in RAM for anti-duplicate prevention and immediate response.
// NO persistent disk, NO file writing, NO database, NO Google Sheets.
let inMemoryOrders: Order[] = [];

// Periodically prune in-memory orders older than 30 minutes to keep RAM lightweight
setInterval(() => {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  inMemoryOrders = inMemoryOrders.filter(o => {
    const time = new Date(o.createdAt).getTime();
    return !isNaN(time) && time > thirtyMinutesAgo;
  });
}, 10 * 60 * 1000).unref?.();

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// 1. Wilayas catalog endpoint
app.get('/api/wilayas', (_req, res) => {
  res.json(ALGERIAN_WILAYAS);
});

// 2. Pricing tiers endpoint (Exact 1000-9000 specification prices)
app.get('/api/pricing', (_req, res) => {
  res.json({
    tiers: buildPricingTiers(),
    exactPrices: EXACT_BUSINESS_CARD_PRICES,
    roundedCornersFeePer1000: 500,
    freeGiftLabel: 'Support carte offert / حامل بطاقات هدية (GRATUIT — مجاني)'
  });
});

// --- Admin Authentication Setup ---
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'kalissi2026';
const adminSessions = new Set<string>();

export function generateAdminToken(): string {
  const now = Date.now().toString();
  const signature = crypto.createHmac('sha256', ADMIN_PASSCODE).update(now).digest('hex').substring(0, 16);
  return `adm_${now}_${signature}`;
}

export function verifyAdminToken(token?: string | null): boolean {
  if (!token) return false;
  if (adminSessions.has(token)) return true;
  if (!token.startsWith('adm_')) return false;
  const parts = token.split('_');
  if (parts.length !== 3) return false;
  const [, timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);
  if (isNaN(timestamp)) return false;
  // Token valid for 7 days
  if (Date.now() - timestamp > 7 * 24 * 3600 * 1000) return false;
  const expectedSig = crypto.createHmac('sha256', ADMIN_PASSCODE).update(timestampStr).digest('hex').substring(0, 16);
  return signature === expectedSig;
}

function checkIsAdmin(req: express.Request): boolean {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-admin-token'] as string);
  const passcode = req.headers['x-admin-passcode'];

  if ((token && verifyAdminToken(token)) || (passcode && passcode === ADMIN_PASSCODE)) {
    return true;
  }
  return false;
}

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (checkIsAdmin(req)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Accès administrateur requis. Cette section est strictement réservée à l\'administration.'
  });
}

// 3. Integration status endpoint (Public gets booleans, Admin gets full configuration)
app.get('/api/config/status', (req, res) => {
  const isAdmin = checkIsAdmin(req);
  const zr = isZRExpressConfigured();

  if (!isAdmin) {
    return res.json({
      zrExpress: {
        configured: zr.configured
      }
    });
  }

  return res.json({
    zrExpress: {
      configured: zr.configured,
      detail: zr.detail,
      missing: zr.missing,
      baseUrl: zr.baseUrl,
      tenant: zr.tenant ? `${zr.tenant.substring(0, 8)}...` : undefined,
      hasApiKey: zr.hasApiKey,
      hasToken: zr.hasApiKey
    }
  });
});

// 4. Update configuration endpoint (Protected: Admin Only)
app.post('/api/config/update', requireAdminAuth, (req, res) => {
  const {
    xTenant,
    zrTenant,
    xApiKey,
    zrApiKey,
    zrApiToken,
    zrClientCode,
    zrApiBaseUrl
  } = req.body;

  const tenantVal = xTenant || zrTenant || zrClientCode;
  const apiVal = xApiKey || zrApiKey || zrApiToken;
  const baseUrlVal = zrApiBaseUrl;

  if (tenantVal !== undefined) {
    process.env.X_TENANT = tenantVal;
    process.env.ZR_TENANT = tenantVal;
  }
  if (apiVal !== undefined) {
    process.env.X_API_KEY = apiVal;
    process.env.ZR_API_KEY = apiVal;
  }
  if (baseUrlVal !== undefined) {
    process.env.ZR_API_BASE_URL = baseUrlVal;
  }

  res.json({
    success: true,
    message: 'Configuration mise à jour en mémoire pour la session actuelle.',
    status: {
      zrExpress: isZRExpressConfigured()
    }
  });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;
  if (!passcode || String(passcode).trim() !== ADMIN_PASSCODE) {
    return res.status(401).json({
      success: false,
      message: 'Code administrateur incorrect.'
    });
  }

  const token = generateAdminToken();
  adminSessions.add(token);
  return res.json({
    success: true,
    token,
    message: 'Connexion administrateur réussie.'
  });
});

// Admin Session Verification
app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-admin-token'] as string);
  const passcode = req.headers['x-admin-passcode'];

  if ((token && verifyAdminToken(token)) || (passcode && passcode === ADMIN_PASSCODE)) {
    return res.json({ success: true, isAdmin: true });
  }
  return res.status(401).json({ success: false, isAdmin: false });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-admin-token'];
  if (token) {
    adminSessions.delete(String(token));
  }
  return res.json({ success: true, message: 'Déconnexion administrateur réussie.' });
});

// Customer Public Order Tracking (Secure token-based single order lookup)
app.get('/api/orders/track', (req, res) => {
  const { code, token } = req.query;
  if (!code || !token) {
    return res.status(400).json({
      success: false,
      message: 'Code de commande et jeton sécurisé requis.'
    });
  }

  const order = inMemoryOrders.find(
    o => o.orderCode === String(code).toUpperCase().trim() && (o.orderToken === token || o.id === token)
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Commande introuvable ou jeton invalide.'
    });
  }

  // Returns ONLY the customer's own order
  return res.json({
    success: true,
    order: {
      orderCode: order.orderCode,
      createdAt: order.createdAt,
      status: order.status,
      customer: {
        fullName: order.customer.fullName,
        deliveryType: order.customer.deliveryType,
        wilayaName: order.customer.wilayaName,
        commune: order.customer.commune,
        zrStopDesk: order.customer.zrStopDesk,
        address: order.customer.address
      },
      cardConfig: order.cardConfig,
      pricing: order.pricing,
      zrExpress: {
        status: order.zrExpress?.status,
        trackingNumber: order.zrExpress?.trackingNumber
      }
    }
  });
});

// 6. Test ZR Express: Performs REAL HTTP call to ZR Express API and returns status & body
app.post('/api/config/test-zr', requireAdminAuth, async (_req, res) => {
  const result = await testZRExpressConnection();
  res.json(result);
});

// 7. Get orders list (Protected: Admin Only)
app.get('/api/orders', requireAdminAuth, (req, res) => {
  const { status, search, wilaya } = req.query;
  let results = [...inMemoryOrders];

  if (status && status !== 'all') {
    results = results.filter(o => o.status === status);
  }
  if (wilaya && wilaya !== 'all') {
    results = results.filter(o => o.customer.wilayaCode === wilaya);
  }
  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(o =>
      o.orderCode.toLowerCase().includes(q) ||
      o.customer.fullName.toLowerCase().includes(q) ||
      o.customer.phone.includes(q) ||
      (o.customer.commune && o.customer.commune.toLowerCase().includes(q)) ||
      (o.customer.zrStopDesk && o.customer.zrStopDesk.toLowerCase().includes(q))
    );
  }

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    orders: results,
    total: results.length,
    duplicateCount: inMemoryOrders.filter(o => o.isDuplicateFlagged || o.status === 'duplicate_blocked').length
  });
});

// Bulk Delete Orders (Protected: Admin Only)
app.delete('/api/orders', requireAdminAuth, (req, res) => {
  const { orderIds } = req.body;
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Veuillez sélectionner au moins une commande à supprimer.'
    });
  }

  const idsToDelete = new Set(orderIds);
  const initialCount = inMemoryOrders.length;
  inMemoryOrders = inMemoryOrders.filter(o => !idsToDelete.has(o.id));
  const deletedCount = initialCount - inMemoryOrders.length;

  return res.json({
    success: true,
    deletedCount,
    message: `${deletedCount} commande(s) supprimée(s) avec succès.`
  });
});

/**
 * Shared order creation and submission engine.
 * Protected by multi-layer anti-abuse: IP rate limiting, honeypot, fast-bot detection,
 * Cloudflare Turnstile, strict server validation, anti-duplicate safeguard,
 * and safe server-side ZR Express parcel creation.
 */
async function processOrderCreation(
  body: {
    customer: CustomerInfo;
    cardConfig: CardOrderConfig;
    ignoreDuplicateWarning?: boolean;
    channel?: 'whatsapp' | 'messenger';
    turnstileToken?: string;
    formLoadedAt?: number;
    hp_field?: string;
  },
  ip: string
): Promise<{ statusCode: number; data: any }> {
  const { customer, cardConfig, ignoreDuplicateWarning, channel, turnstileToken, formLoadedAt, hp_field } = body;

  // 1. IP Rate Limiting (Max 5 order creations per 15 minutes per IP)
  const rateLimit = checkOrderRateLimit(ip);
  if (!rateLimit.allowed) {
    logSecurityEvent('RateLimitBlocked', {
      ip,
      resetInMinutes: rateLimit.resetInMinutes
    });
    return {
      statusCode: 429,
      data: {
        success: false,
        errorType: 'rate_limit_exceeded',
        message: `Trop de tentatives de commande depuis cette adresse IP. Veuillez patienter ${rateLimit.resetInMinutes} minute(s) avant de réessayer. / تم تجاوز الحد المسموح به من المحاولات، يرجى الانتظار.`
      }
    };
  }

  // 2. Anti-Bot: Invisible Honeypot check
  if (hp_field && String(hp_field).trim() !== '') {
    logSecurityEvent('HoneypotTriggered', { ip });
    return {
      statusCode: 400,
      data: {
        success: false,
        errorType: 'invalid_submission',
        message: 'Requête non valide.'
      }
    };
  }

  // 3. Anti-Bot: Minimum submission time check (< 2.5s is an automated script)
  if (formLoadedAt && typeof formLoadedAt === 'number') {
    const elapsed = Date.now() - formLoadedAt;
    if (elapsed > 0 && elapsed < 2500) {
      logSecurityEvent('FastSubmissionBlocked', { ip, elapsedMs: elapsed });
      return {
        statusCode: 429,
        data: {
          success: false,
          errorType: 'submission_too_fast',
          message: 'Soumission trop rapide. Veuillez patienter quelques secondes avant de valider votre commande.'
        }
      };
    }
  }

  // 4. Cloudflare Turnstile Verification
  const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileCheck.success) {
    return {
      statusCode: 403,
      data: {
        success: false,
        errorType: 'captcha_failed',
        message: turnstileCheck.message || 'Validation de sécurité Turnstile échouée.'
      }
    };
  }

  // 5. Strict Customer & Card Configuration Validation
  const validation = validateBusinessCardOrder(customer || {}, cardConfig || {});
  if (!validation.isValid) {
    return {
      statusCode: 400,
      data: {
        success: false,
        errorType: 'validation_error',
        message: 'Erreur de validation du formulaire de commande.',
        errors: validation.errors
      }
    };
  }

  // 6. Pricing Calculation on server ONLY (Cards + Rounded Corners + Delivery + Total à payer)
  const pricing = calculateCardOrderPricing(cardConfig as CardOrderConfig, customer as CustomerInfo);

  // 7. Anti-Duplicate Protection
  const duplicateCheck = checkCardOrderDuplicate(
    inMemoryOrders,
    customer as CustomerInfo,
    cardConfig as CardOrderConfig,
    pricing.total
  );

  if (duplicateCheck.isDuplicate && !ignoreDuplicateWarning) {
    return {
      statusCode: 409,
      data: {
        success: false,
        errorType: 'duplicate_blocked',
        isDuplicate: true,
        message: duplicateCheck.reason,
        existingOrderId: duplicateCheck.existingOrderId,
        existingOrderCode: duplicateCheck.existingOrderCode,
        minutesAgo: duplicateCheck.minutesAgo
      }
    };
  }

  // 8. Register attempt in rate limit history
  recordOrderAttempt(ip);

  // 9. Generate Unique 8-Character Order Code & One-time Secure Token
  const orderCode = generate8CharOrderCode();
  const orderToken = generateOneTimeSecureToken();
  const fingerprint = generateCardOrderFingerprint(customer as CustomerInfo, cardConfig as CardOrderConfig, pricing.total);

  const validChannel = channel === 'messenger' ? 'messenger' : (channel === 'whatsapp' ? 'whatsapp' : undefined);

  const newOrder: Order = {
    id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderCode,
    orderToken,
    createdAt: new Date().toISOString(),
    customer: customer as CustomerInfo,
    cardConfig: {
      ...cardConfig,
      freeCardHolderGift: true
    },
    pricing,
    weightKg: pricing.weightKg,
    channel: validChannel,
    status: duplicateCheck.isDuplicate ? 'duplicate_blocked' : 'new',
    fingerprint,
    ipAddress: ip,
    isDuplicateFlagged: duplicateCheck.isDuplicate,
    duplicateReason: duplicateCheck.reason,
    zrExpress: {
      status: 'pending'
    }
  };

  // 10. Execute REAL ZR Express POST /parcels request ONLY after all security gates passed
  try {
    const zrResult = await createZRExpressColis(newOrder);
    newOrder.zrExpress = {
      status: zrResult.status,
      trackingNumber: zrResult.trackingNumber,
      parcelId: zrResult.parcelId,
      labelUrl: zrResult.labelUrl,
      weightKg: newOrder.weightKg || newOrder.pricing?.weightKg,
      createdAt: new Date().toISOString(),
      httpStatus: zrResult.httpStatus,
      rawResponse: zrResult.rawResponse,
      error: zrResult.error || (!zrResult.success ? zrResult.message : undefined)
    };
    if (zrResult.success) {
      newOrder.status = 'shipped_zr';
    }
  } catch (err: any) {
    console.error('[ZR Express Error in Order Processing]', err);
    newOrder.zrExpress = {
      status: 'failed',
      error: err?.message
    };
  }

  // Keep in memory buffer for active session & anti-duplicate tracking
  inMemoryOrders.unshift(newOrder);

  logSecurityEvent('OrderSubmitted', {
    orderCode: newOrder.orderCode,
    ip,
    status: newOrder.status,
    zrTrackingNumber: newOrder.zrExpress?.trackingNumber || null
  });

  return {
    statusCode: 201,
    data: {
      success: true,
      order: newOrder,
      message: 'Commande de cartes de visite confirmée avec succès.',
      zrExpressResult: newOrder.zrExpress
    }
  };
}

// 8. Primary Order Endpoint (POST /api/orders)
app.post('/api/orders', async (req, res) => {
  const ip = getClientIp(req);
  const result = await processOrderCreation(req.body, ip);
  return res.status(result.statusCode).json(result.data);
});

// 9. Order Submit Endpoint (POST /api/orders/submit)
app.post('/api/orders/submit', async (req, res) => {
  const ip = getClientIp(req);
  const result = await processOrderCreation(req.body, ip);
  return res.status(result.statusCode).json(result.data);
});

// 10. Order Confirm Endpoint (POST /api/orders/confirm)
app.post('/api/orders/confirm', async (req, res) => {
  const ip = getClientIp(req);
  const { orderId, id, orderCode } = req.body;
  const lookupId = orderId || id;

  let existingOrder: Order | undefined;
  if (lookupId) {
    existingOrder = inMemoryOrders.find(o => o.id === lookupId);
  } else if (orderCode) {
    existingOrder = inMemoryOrders.find(o => o.orderCode === orderCode);
  }

  if (existingOrder) {
    // If order already has a tracking number, prevent duplicate parcel creation
    if (existingOrder.zrExpress?.trackingNumber) {
      return res.json({
        success: true,
        order: existingOrder,
        zrExpressResult: existingOrder.zrExpress,
        message: 'Cette commande a déjà été expédiée avec ZR Express.'
      });
    }

    // Check rate limit before sending to ZR Express
    const rateLimit = checkOrderRateLimit(ip);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        errorType: 'rate_limit_exceeded',
        message: 'Trop de requêtes. Veuillez patienter.'
      });
    }

    recordOrderAttempt(ip);

    const zrResult = await createZRExpressColis(existingOrder);
    existingOrder.zrExpress = {
      status: zrResult.status,
      trackingNumber: zrResult.trackingNumber,
      parcelId: zrResult.parcelId,
      labelUrl: zrResult.labelUrl,
      weightKg: existingOrder.weightKg || existingOrder.pricing?.weightKg,
      createdAt: new Date().toISOString(),
      httpStatus: zrResult.httpStatus,
      rawResponse: zrResult.rawResponse,
      error: zrResult.error || (!zrResult.success ? zrResult.message : undefined)
    };
    if (zrResult.success) {
      existingOrder.status = 'shipped_zr';
    }
    return res.json({
      success: true,
      order: existingOrder,
      zrExpressResult: existingOrder.zrExpress
    });
  }

  // If payload contains customer data, create and confirm in one step
  if (req.body.customer) {
    const result = await processOrderCreation(req.body, ip);
    return res.status(result.statusCode).json(result.data);
  }

  return res.status(404).json({ success: false, message: 'Commande introuvable pour confirmation.' });
});

// 11. Specific Order Confirm Route (POST /api/orders/:id/confirm)
app.post('/api/orders/:id/confirm', async (req, res) => {
  const ip = getClientIp(req);
  const { id } = req.params;
  const order = inMemoryOrders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Commande introuvable.' });
  }

  // If already shipped, do not duplicate
  if (order.zrExpress?.trackingNumber) {
    return res.json({
      success: true,
      order,
      zrExpressResult: order.zrExpress,
      message: 'Cette commande possède déjà un numéro de suivi ZR Express.'
    });
  }

  const rateLimit = checkOrderRateLimit(ip);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      errorType: 'rate_limit_exceeded',
      message: 'Trop de requêtes. Veuillez patienter.'
    });
  }

  recordOrderAttempt(ip);

  const zrResult = await createZRExpressColis(order);
  order.zrExpress = {
    status: zrResult.status,
    trackingNumber: zrResult.trackingNumber,
    parcelId: zrResult.parcelId,
    labelUrl: zrResult.labelUrl,
    weightKg: order.weightKg || order.pricing?.weightKg,
    createdAt: new Date().toISOString(),
    httpStatus: zrResult.httpStatus,
    rawResponse: zrResult.rawResponse,
    error: zrResult.error || (!zrResult.success ? zrResult.message : undefined)
  };
  if (zrResult.success) {
    order.status = 'shipped_zr';
  }
  res.json({
    success: true,
    order,
    zrExpressResult: order.zrExpress
  });
});

// Update order status (Protected: Admin Only)
app.patch('/api/orders/:id/status', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const orderIndex = inMemoryOrders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: 'Commande introuvable.' });
  }

  inMemoryOrders[orderIndex].status = status;

  res.json({ success: true, order: inMemoryOrders[orderIndex] });
});

// Send order to ZR Express (single transmission safeguard) (Protected: Admin Only)
app.post('/api/orders/:id/create-zr-colis', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  const order = inMemoryOrders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Commande introuvable.' });
  }

  const result = await createZRExpressColis(order);
  order.zrExpress = {
    status: result.status,
    trackingNumber: result.trackingNumber,
    parcelId: result.parcelId,
    labelUrl: result.labelUrl,
    createdAt: new Date().toISOString(),
    httpStatus: result.httpStatus,
    rawResponse: result.rawResponse,
    error: result.error || (!result.success ? result.message : undefined)
  };

  if (result.success) {
    order.status = 'shipped_zr';
  }

  res.json(result);
});

// Start Express Server
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kalissi Arts - Business Card System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
