const IAMPORT_API_BASE = 'https://api.iamport.kr';
const PAYMENT_LOOKUP_ATTEMPTS = 5;
const PAYMENT_LOOKUP_DELAY_MS = 500;

let cachedToken = null;
let tokenExpiresAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPaymentNotFoundMessage(message) {
  return typeof message === 'string' && message.includes('존재하지 않는 결제');
}

function getPortOneCredentials() {
  const imp_key = process.env.PORTONE_API_KEY?.trim() || '';
  const imp_secret = process.env.PORTONE_API_SECRET?.trim() || '';
  if (!imp_key || !imp_secret) return null;
  return { imp_key, imp_secret };
}

async function getIamportAccessToken() {
  const creds = getPortOneCredentials();
  if (!creds) return null;

  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 30_000) {
    return cachedToken;
  }

  const res = await fetch(`${IAMPORT_API_BASE}/users/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });

  if (!res.ok) {
    throw new Error('Failed to obtain PortOne API token');
  }

  const data = await res.json();
  if (data?.code !== 0 && data?.code !== undefined && !data?.response?.access_token) {
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : 'Failed to obtain PortOne API token';
    throw new Error(msg);
  }

  const token = data?.response?.access_token;
  const expiredAt = data?.response?.expired_at;
  if (!token) {
    throw new Error('PortOne API token response is invalid');
  }

  cachedToken = token;
  tokenExpiresAt =
    typeof expiredAt === 'number'
      ? expiredAt * 1000
      : now + 30 * 60 * 1000;

  return token;
}

/**
 * 포트원 결제 단건 조회 (imp_uid)
 * @returns {Promise<{ ok: true, payment: object } | { ok: false, message: string, code?: string }>}
 */
export async function fetchPortOnePayment(imp_uid) {
  const trimmed = typeof imp_uid === 'string' ? imp_uid.trim() : '';
  if (!trimmed) {
    return { ok: false, message: 'imp_uid is required', code: 'invalid_imp_uid' };
  }

  const creds = getPortOneCredentials();
  if (!creds) {
    return {
      ok: false,
      message: 'PortOne API credentials are not configured on server',
      code: 'portone_not_configured',
    };
  }

  const token = await getIamportAccessToken();
  const res = await fetch(`${IAMPORT_API_BASE}/payments/${encodeURIComponent(trimmed)}`, {
    headers: { Authorization: token },
  });

  const data = await res.json().catch(() => ({}));
  const payment = data?.response;

  if (!res.ok || !payment) {
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : 'Failed to verify payment with PortOne';
    const code = isPaymentNotFoundMessage(msg)
      ? 'portone_payment_not_found'
      : 'portone_fetch_failed';
    return { ok: false, message: msg, code };
  }

  return { ok: true, payment };
}

async function fetchPortOnePaymentByMerchantUid(merchant_uid) {
  const trimmed = typeof merchant_uid === 'string' ? merchant_uid.trim() : '';
  if (!trimmed) {
    return { ok: false, message: 'merchant_uid is required', code: 'invalid_merchant_uid' };
  }

  const creds = getPortOneCredentials();
  if (!creds) {
    return {
      ok: false,
      message: 'PortOne API credentials are not configured on server',
      code: 'portone_not_configured',
    };
  }

  const token = await getIamportAccessToken();
  const res = await fetch(
    `${IAMPORT_API_BASE}/payments/find/${encodeURIComponent(trimmed)}`,
    { headers: { Authorization: token } }
  );

  const data = await res.json().catch(() => ({}));
  const payment = data?.response;

  if (!res.ok || !payment) {
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : 'Failed to verify payment with PortOne';
    const code = isPaymentNotFoundMessage(msg)
      ? 'portone_payment_not_found'
      : 'portone_fetch_failed';
    return { ok: false, message: msg, code };
  }

  return { ok: true, payment };
}

async function fetchPortOnePaymentWithRetry(imp_uid, merchant_uid) {
  let last = await fetchPortOnePayment(imp_uid);
  for (let i = 1; i < PAYMENT_LOOKUP_ATTEMPTS; i += 1) {
    if (last.ok || last.code !== 'portone_payment_not_found') {
      return last;
    }
    await sleep(PAYMENT_LOOKUP_DELAY_MS * i);
    last = await fetchPortOnePayment(imp_uid);
  }

  if (!last.ok && last.code === 'portone_payment_not_found' && merchant_uid) {
    const byMerchant = await fetchPortOnePaymentByMerchantUid(merchant_uid);
    if (byMerchant.ok) return byMerchant;
  }

  return last;
}

/**
 * @param {{ imp_uid: string, merchant_uid?: string, amount: number }} params
 */
export async function verifyPortOnePaymentForOrder(params) {
  const { imp_uid, merchant_uid, amount } = params;
  const result = await fetchPortOnePaymentWithRetry(imp_uid, merchant_uid);

  if (!result.ok) {
    if (result.code === 'portone_not_configured') {
      return {
        ok: true,
        skipped: true,
        payment: null,
        message: result.message,
      };
    }
    if (result.code === 'portone_payment_not_found') {
      return {
        ok: false,
        message:
          'PortOne REST could not find this payment. Check that VITE_PORTONE_IMP_CODE matches PORTONE_API_KEY/SECRET (same merchant).',
        code: result.code,
      };
    }
    return result;
  }

  const p = result.payment;
  const status = typeof p.status === 'string' ? p.status : '';
  const paidAmount = Number(p.amount);
  const pgMerchantUid =
    typeof p.merchant_uid === 'string' ? p.merchant_uid.trim() : '';

  const payableStatuses = new Set(['paid', 'ready']);
  if (!payableStatuses.has(status)) {
    return {
      ok: false,
      message: `Payment is not completed (status: ${status || 'unknown'})`,
      code: 'payment_not_paid',
    };
  }

  if (Number.isFinite(amount) && Number.isFinite(paidAmount) && paidAmount !== amount) {
    return {
      ok: false,
      message: 'Payment amount mismatch',
      code: 'payment_amount_mismatch',
    };
  }

  if (
    merchant_uid &&
    pgMerchantUid &&
    pgMerchantUid !== merchant_uid.trim()
  ) {
    return {
      ok: false,
      message: 'merchant_uid does not match PortOne payment record',
      code: 'merchant_uid_mismatch',
    };
  }

  return {
    ok: true,
    skipped: false,
    payment: p,
    status,
    paidAmount,
    pgMerchantUid,
  };
}

export function isPortOneVerifyConfigured() {
  return getPortOneCredentials() !== null;
}

/**
 * 결제 승인 후 주문 처리 실패 시 전액 취소 (imp_uid 우선)
 * @param {{ imp_uid?: string, merchant_uid?: string, reason?: string }} params
 */
export async function cancelPortOnePayment(params) {
  const imp_uid = typeof params?.imp_uid === 'string' ? params.imp_uid.trim() : '';
  const merchant_uid =
    typeof params?.merchant_uid === 'string' ? params.merchant_uid.trim() : '';
  const reason =
    typeof params?.reason === 'string' && params.reason.trim()
      ? params.reason.trim()
      : '주문 처리 실패로 결제를 취소합니다';

  if (!imp_uid && !merchant_uid) {
    return { ok: false, message: 'imp_uid or merchant_uid is required', code: 'invalid_cancel' };
  }

  const creds = getPortOneCredentials();
  if (!creds) {
    return {
      ok: false,
      message: 'PortOne API credentials are not configured on server',
      code: 'portone_not_configured',
    };
  }

  const token = await getIamportAccessToken();
  const body = { reason };
  if (imp_uid) body.imp_uid = imp_uid;
  else body.merchant_uid = merchant_uid;

  const res = await fetch(`${IAMPORT_API_BASE}/payments/cancel`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data?.code !== 0 && data?.code !== undefined && !data?.response)) {
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : 'Failed to cancel PortOne payment';
    return { ok: false, message: msg, code: 'portone_cancel_failed' };
  }

  return { ok: true, payment: data.response ?? null };
}