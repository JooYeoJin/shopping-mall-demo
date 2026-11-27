import { Cart } from '../models/Cart.js';
import { CheckoutIntent } from '../models/CheckoutIntent.js';
import { Order, ORDER_STATUS, PAYMENT_STATUS } from '../models/Order.js';
import { cancelPortOnePayment } from './portoneVerify.js';

/** 포트원 결제 완료(또는 가상계좌 발급) 결과 반영 */
export function applyPortOnePayment(orderPayload, paymentMethod, portone) {
  if (!orderPayload.payment) orderPayload.payment = {};
  orderPayload.payment.method = paymentMethod;
  orderPayload.payment.transaction_id = portone.imp_uid;
  const merchantUid =
    portone.merchant_uid || orderPayload.payment.merchant_uid;
  if (merchantUid) {
    orderPayload.payment.merchant_uid = merchantUid;
  }

  if (portone.status === 'paid') {
    const now = new Date();
    orderPayload.status = ORDER_STATUS.PAID;
    orderPayload.payment.status = PAYMENT_STATUS.PAID;
    orderPayload.payment.paid_at = now;
  } else {
    orderPayload.status = ORDER_STATUS.PENDING;
    orderPayload.payment.status = PAYMENT_STATUS.PENDING;
  }

  if (typeof orderPayload.markModified === 'function') {
    orderPayload.markModified('payment');
  }
}

export async function clearUserCart(userId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) return;
  cart.items = [];
  await cart.save();
}

export function isAlreadyFulfilled(order, imp_uid) {
  if (!order) return false;
  if (order.status === ORDER_STATUS.PAID && order.payment?.status === PAYMENT_STATUS.PAID) {
    if (!imp_uid) return true;
    return order.payment.transaction_id === imp_uid;
  }
  return false;
}

export async function markOrderPaymentCancelled(order, reason) {
  const paid =
    order.payment?.status === PAYMENT_STATUS.PAID ||
    order.payment?.status === PAYMENT_STATUS.REFUNDED ||
    Boolean(order.payment?.paid_at);

  if (!paid) {
    await Order.deleteOne({ _id: order._id });
    return null;
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelled_at = order.cancelled_at || new Date();
  order.cancel_reason = reason || order.cancel_reason || '결제 검증 실패로 자동 취소';
  if (!order.payment) order.payment = {};
  order.payment.status = PAYMENT_STATUS.CANCELLED;
  if (typeof order.markModified === 'function') {
    order.markModified('payment');
  }
  await order.save();
  return order;
}

export async function createPaidOrderFromCheckout(intent, portone) {
  const clauses = [
    { 'payment.merchant_uid': intent.merchant_uid },
    { order_id: intent.merchant_uid },
  ];
  if (portone?.imp_uid) {
    clauses.push({ 'payment.transaction_id': portone.imp_uid });
  }

  const existing = await Order.findOne({ $or: clauses });
  if (existing) {
    await CheckoutIntent.deleteOne({ _id: intent._id });
    return existing;
  }

  const orderPayload = {
    order_id: intent.merchant_uid,
    user: intent.user,
    items: intent.items,
    total: intent.total,
    shipping: intent.shipping,
    payment: {
      method: intent.payment_method,
      merchant_uid: intent.merchant_uid,
    },
  };

  applyPortOnePayment(orderPayload, intent.payment_method, portone);

  if (orderPayload.status !== ORDER_STATUS.PAID) {
    const err = new Error(
      `Payment is not completed (status: ${portone?.status || 'unknown'})`
    );
    err.code = 'payment_not_paid';
    throw err;
  }

  const order = await Order.create(orderPayload);
  await CheckoutIntent.deleteOne({ _id: intent._id });
  await clearUserCart(intent.user);
  return order;
}

/**
 * 검증 실패·저장 실패 시 PG 결제를 취소하고 주문을 취소 상태로 맞춤
 */
export async function refundAndCancelOrder(order, portone, reason) {
  const message = reason || '주문 처리 실패로 결제를 취소합니다';
  const cancelResult = await cancelPortOnePayment({
    imp_uid: portone?.imp_uid || order?.payment?.transaction_id,
    merchant_uid:
      portone?.merchant_uid ||
      order?.payment?.merchant_uid ||
      order?.order_id,
    reason: message,
  });

  if (order) {
    await markOrderPaymentCancelled(order, message);
  }

  return {
    refunded: Boolean(cancelResult.ok),
    cancel_message: cancelResult.ok ? null : cancelResult.message,
  };
}
