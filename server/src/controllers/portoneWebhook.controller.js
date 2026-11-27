import { CheckoutIntent } from '../models/CheckoutIntent.js';
import {
  Order,
  ORDER_STATUS,
  PAYMENT_STATUS,
} from '../models/Order.js';
import { verifyPortOnePaymentForOrder } from '../utils/portoneVerify.js';
import {
  applyPortOnePayment,
  clearUserCart,
  createPaidOrderFromCheckout,
  isAlreadyFulfilled,
  refundAndCancelOrder,
} from '../utils/orderFulfillment.js';

function readWebhookPayload(req) {
  const src = req.body && typeof req.body === 'object' ? req.body : {};
  const imp_uid = typeof src.imp_uid === 'string' ? src.imp_uid.trim() : '';
  const merchant_uid =
    typeof src.merchant_uid === 'string' ? src.merchant_uid.trim() : '';
  const status = typeof src.status === 'string' ? src.status.trim().toLowerCase() : '';
  return { imp_uid, merchant_uid, status };
}

/**
 * 포트원 V1 결제 통지.
 * 승인된 결제만 주문으로 저장하고, 결제 전 취소는 checkout intent만 폐기한다.
 */
export async function handlePortOneWebhook(req, res) {
  const expected = process.env.PORTONE_WEBHOOK_SECRET?.trim();
  if (expected) {
    const got =
      (typeof req.query.secret === 'string' ? req.query.secret : '') ||
      (typeof req.headers['x-portone-secret'] === 'string'
        ? req.headers['x-portone-secret']
        : '');
    if (got !== expected) {
      return res.status(401).json({ message: 'Invalid webhook secret' });
    }
  }

  const { imp_uid, merchant_uid, status } = readWebhookPayload(req);
  if (!imp_uid && !merchant_uid) {
    return res.status(400).json({ message: 'imp_uid or merchant_uid required' });
  }

  const clauses = [];
  if (merchant_uid) {
    clauses.push({ 'payment.merchant_uid': merchant_uid });
    clauses.push({ order_id: merchant_uid });
  }
  if (imp_uid) {
    clauses.push({ 'payment.transaction_id': imp_uid });
  }

  const order = await Order.findOne({ $or: clauses });
  const intent = merchant_uid
    ? await CheckoutIntent.findOne({ merchant_uid })
    : null;

  if (status === 'cancelled' || status === 'failed') {
    if (intent) await CheckoutIntent.deleteOne({ _id: intent._id });
    if (order && order.payment?.status !== PAYMENT_STATUS.PAID) {
      await Order.deleteOne({ _id: order._id });
    }
    return res.json({ ok: true, discarded: true });
  }

  if (order) {
    if (isAlreadyFulfilled(order, imp_uid || order.payment?.transaction_id)) {
      if (intent) await CheckoutIntent.deleteOne({ _id: intent._id });
      return res.json({ ok: true, already: true, order_id: order.order_id });
    }

    const lookupUid = imp_uid || order.payment?.transaction_id;
    const lookupMerchant = order.payment?.merchant_uid || order.order_id;
    const verification = await verifyPortOnePaymentForOrder({
      imp_uid: lookupUid,
      merchant_uid: lookupMerchant,
      amount: order.total,
    });

    if (!verification.ok) {
      const refundCodes = new Set([
        'payment_amount_mismatch',
        'merchant_uid_mismatch',
        'payment_not_paid',
      ]);
      if (refundCodes.has(verification.code)) {
        await refundAndCancelOrder(
          order,
          { imp_uid: lookupUid, merchant_uid: lookupMerchant },
          verification.message
        );
        if (intent) await CheckoutIntent.deleteOne({ _id: intent._id });
        return res.json({
          ok: true,
          refunded: true,
          order_id: order.order_id,
        });
      }
      return res.status(503).json({
        ok: false,
        message: verification.message,
        order_id: order.order_id,
      });
    }

    const portone = {
      imp_uid: lookupUid,
      merchant_uid: lookupMerchant,
      paid_amount: verification.paidAmount,
      status: verification.skipped ? status || 'paid' : verification.status,
    };

    applyPortOnePayment(order, order.payment?.method || 'card', portone);
    if (order.status !== ORDER_STATUS.PAID) {
      await refundAndCancelOrder(order, portone, '결제가 완료되지 않아 주문을 유지하지 않습니다');
      if (intent) await CheckoutIntent.deleteOne({ _id: intent._id });
      return res.json({ ok: true, discarded: true });
    }

    await order.save();
    await clearUserCart(order.user);
    if (intent) await CheckoutIntent.deleteOne({ _id: intent._id });
    return res.json({ ok: true, order_id: order.order_id });
  }

  if (!intent) {
    if (imp_uid && (status === 'paid' || status === 'ready' || !status)) {
      await refundAndCancelOrder(null, { imp_uid, merchant_uid }, '주문 없는 결제 자동 취소');
    }
    return res.json({ ok: true, ignored: true });
  }

  const lookupUid = imp_uid;
  const lookupMerchant = intent.merchant_uid;
  const verification = await verifyPortOnePaymentForOrder({
    imp_uid: lookupUid,
    merchant_uid: lookupMerchant,
    amount: intent.total,
  });

  if (!verification.ok) {
    const refundCodes = new Set([
      'payment_amount_mismatch',
      'merchant_uid_mismatch',
      'payment_not_paid',
    ]);
    if (refundCodes.has(verification.code) && lookupUid) {
      await refundAndCancelOrder(
        null,
        { imp_uid: lookupUid, merchant_uid: lookupMerchant },
        verification.message
      );
    }
    await CheckoutIntent.deleteOne({ _id: intent._id });
    return res.json({ ok: true, discarded: true });
  }

  const portone = {
    imp_uid: lookupUid,
    merchant_uid: lookupMerchant,
    paid_amount: verification.paidAmount,
    status: verification.skipped ? status || 'paid' : verification.status,
  };

  try {
    const created = await createPaidOrderFromCheckout(intent, portone);
    return res.json({ ok: true, order_id: created.order_id });
  } catch {
    if (lookupUid) {
      await refundAndCancelOrder(
        null,
        portone,
        '주문 저장 실패로 결제를 취소합니다'
      );
    }
    await CheckoutIntent.deleteOne({ _id: intent._id });
    return res.json({ ok: true, discarded: true });
  }
}
