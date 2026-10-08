/**
 * Security, Anti-Abuse & Turnstile Verification Service
 * Kalissi Arts — Order Protection Engine
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Rate limit parameters: Max 5 orders per 15 minutes per IP
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ORDERS_PER_WINDOW = 5;

// Periodically clean up stale rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    record.timestamps = record.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (record.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref?.();

/**
 * Mask client IP for GDPR / privacy-compliant logging
 * e.g., 197.112.45.89 -> 197.112.xxx.xxx
 */
export function maskIp(ip: string): string {
  if (!ip) return 'unknown';
  if (ip === '::1' || ip === '127.0.0.1') return '127.0.0.1';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  } else if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 2).join(':')}:xxxx:xxxx`;
  }
  return 'xxx.xxx.xxx.xxx';
}

/**
 * Server security event logger.
 * Never outputs sensitive tokens or API credentials.
 */
export function logSecurityEvent(type: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = { ...details };
  if (sanitizedDetails.ip) {
    sanitizedDetails.maskedIp = maskIp(sanitizedDetails.ip);
    delete sanitizedDetails.ip;
  }
  console.log(`[Security][${type}] ${timestamp}`, JSON.stringify(sanitizedDetails));
}

/**
 * Check if the given client IP has exceeded the order submission rate limit.
 */
export function checkOrderRateLimit(clientIp: string): {
  allowed: boolean;
  remaining: number;
  resetInMinutes: number;
} {
  const now = Date.now();
  let record = rateLimitMap.get(clientIp);

  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(clientIp, record);
  }

  // Filter out timestamps outside the active 15m window
  record.timestamps = record.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_ORDERS_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const resetInMinutes = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 60000));
    return {
      allowed: false,
      remaining: 0,
      resetInMinutes
    };
  }

  // Allowed
  const remaining = MAX_ORDERS_PER_WINDOW - record.timestamps.length;
  return {
    allowed: true,
    remaining,
    resetInMinutes: 0
  };
}

/**
 * Record a valid order attempt to the IP's rate limit window
 */
export function recordOrderAttempt(clientIp: string): void {
  const now = Date.now();
  let record = rateLimitMap.get(clientIp);
  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(clientIp, record);
  }
  record.timestamps.push(now);
}

/**
 * Server-side Cloudflare Turnstile Verification.
 * If TURNSTILE_SECRET_KEY is not configured in environment variables,
 * verification gracefully passes with a warning so development and standard operation are never broken.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  clientIp: string
): Promise<{ success: boolean; bypassed?: boolean; message?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If secret key is not set, allow graceful bypass without breaking the application
  if (!secretKey || !secretKey.trim()) {
    logSecurityEvent('TurnstileBypass', {
      ip: clientIp,
      reason: 'TURNSTILE_SECRET_KEY_NOT_CONFIGURED'
    });
    return { success: true, bypassed: true };
  }

  // If secret key IS set, the token MUST be provided and valid
  if (!token || typeof token !== 'string' || !token.trim()) {
    logSecurityEvent('TurnstileFailed', {
      ip: clientIp,
      reason: 'MISSING_TURNSTILE_TOKEN'
    });
    return {
      success: false,
      message: 'Token de vérification Turnstile manquant ou invalide.'
    };
  }

  try {
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const formData = new URLSearchParams();
    formData.append('secret', secretKey.trim());
    formData.append('response', token.trim());
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const res = await fetch(verifyUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!res.ok) {
      logSecurityEvent('TurnstileFailed', {
        ip: clientIp,
        httpStatus: res.status,
        reason: 'HTTP_VERIFICATION_ERROR'
      });
      return {
        success: false,
        message: 'Impossible de joindre le service de vérification Cloudflare Turnstile.'
      };
    }

    const data: any = await res.json();
    if (data.success) {
      logSecurityEvent('TurnstileSuccess', {
        ip: clientIp
      });
      return { success: true };
    }

    logSecurityEvent('TurnstileFailed', {
      ip: clientIp,
      errorCodes: data['error-codes'] || []
    });
    return {
      success: false,
      message: 'Échec de la validation du captcha de sécurité Cloudflare Turnstile.'
    };
  } catch (err: any) {
    logSecurityEvent('TurnstileError', {
      ip: clientIp,
      error: err?.message || 'NETWORK_EXCEPTION'
    });
    return {
      success: false,
      message: 'Erreur lors de la validation du captcha de sécurité.'
    };
  }
}
