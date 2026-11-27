import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { CheckoutIntent } from '../models/CheckoutIntent.js';
import {
  Order,
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
} from '../models/Order.js';
import { handleOrderError } from '../utils/orderError.js';
import { generateOrderId } from '../utils/orderId.js';
import { isValidObjectId } from '../utils/objectId.js';
import { verifyPortOnePaymentForOrder } from '../utils/portoneVerify.js';
import {
  applyPortOnePayment,
  clearUserCart,
  createPaidOrderFromCheckout,
  isAlreadyFulfilled,
  refundAndCancelOrder,
} from '../utils/orderFulfillment.js';
import {
  fulfillmentRank,
  getFulfillmentTransitionError,
} from '../utils/fulfillmentTransition.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const CANCELLABLE_STATUSES = new Set([ORDER_STATUS.PENDING, ORDER_STATUS.PAID]);

function parseListQuery(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  let limit = Number.parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
  const skip = (page - 1) * limit;
  const status =
    typeof query.status === 'string' ? query.status.trim() : '';
  return { page, limit, skip, status };
}

function normalizeShippingInput(body) {
  const src = body?.shipping && typeof body.shipping === 'object' ? body.shipping : body;
  if (!src || typeof src !== 'object') return null;

  const recipient_name =
    typeof src.recipient_name === 'string' ? src.recipient_name.trim() : '';
  const phone = typeof src.phone === 'string' ? src.phone.trim() : '';
  const address = typeof src.address === 'string' ? src.address.trim() : '';

  if (!recipient_name || !phone || !address) return null;

  const postal_code =
    typeof src.postal_code === 'string' ? src.postal_code.trim() || null : null;
  const address_detail =
    typeof src.address_detail === 'string'
      ? src.address_detail.trim() || null
      : null;
  const memo = typeof src.memo === 'string' ? src.memo.trim() || null : null;

  return {
    recipient_name,
    phone,
    postal_code,
    address,
    address_detail,
    memo,
    carrier: null,
    tracking_number: null,
    shipped_at: null,
    delivered_at: null,
  };
}

function resolvePaymentMethod(raw) {
  const method =
    typeof raw === 'string' ? raw.trim().toLowerCase() : 'mock';
  if (!PAYMENT_METHODS.includes(method)) return null;
  return method;
}

function buildOrderItemsFromCart(cart, productsById) {
  const items = [];

  for (const line of cart.items) {
    const productId = line.product?.toString?.() ?? String(line.product);
    const product = productsById.get(productId);
    if (!product) {
      return { error: `Product not found for cart item (${productId})` };
    }

    const unit_price = line.unit_price;
    const quantity = line.quantity;
    const line_total = unit_price * quantity;

    items.push({
      product: product._id,
      product_id: product.product_id,
      name: product.name,
      image: { url: product.image.url },
      category: product.category,
      quantity,
      unit_price,
      line_total,
    });
  }

  const total = items.reduce((sum, item) => sum + item.line_total, 0);
  return { items, total };
}

function applyMockPayment(orderPayload, orderId) {
  const now = new Date();
  orderPayload.status = ORDER_STATUS.PAID;
  orderPayload.payment = {
    status: PAYMENT_STATUS.PAID,
    method: 'mock',
    paid_at: now,
    transaction_id: `MOCK-${orderId}`,
  };
}

/** 포트원 결과 읽기 */
function readPortOneResult(body) {
  const src =
    body?.portone && typeof body.portone === 'object' ? body.portone : body;
  if (!src || typeof src !== 'object') return null;

  const imp_uid =
    typeof src.imp_uid === 'string' ? src.imp_uid.trim() : '';
  const merchant_uid =
    typeof src.merchant_uid === 'string' ? src.merchant_uid.trim() : '';
  if (!imp_uid) return null;

  const paid_amount =
    src.paid_amount !== undefined ? Number(src.paid_amount) : null;
  const status =
    typeof src.status === 'string' ? src.status.trim().toLowerCase() : 'paid';

  return { imp_uid, merchant_uid, paid_amount, status };
}

/** 결제 중복·포트원 검증 (주문 생성 전) */
async function findDuplicatePaidOrder({ imp_uid, merchant_uid, excludeId }) {
  const clauses = [];
  if (imp_uid) clauses.push({ 'payment.transaction_id': imp_uid });
  if (merchant_uid) {
    clauses.push({
      'payment.merchant_uid': merchant_uid,
      'payment.status': PAYMENT_STATUS.PAID,
    });
  }
  if (clauses.length === 0) return null;
  const filter = { $or: clauses };
  if (excludeId) filter._id = { $ne: excludeId };
  return Order.findOne(filter).select('_id order_id payment');
}

const AUTO_REFUND_CODES = new Set([
  'payment_amount_mismatch',
  'merchant_uid_mismatch',
  'payment_not_paid',
  'portone_payment_not_found',
  'portone_fetch_failed',
]);

async function ensurePortOnePaymentSafe(portone, expectedTotal, { excludeOrderId } = {}) {
  const existing = await findDuplicatePaidOrder({
    ...portone,
    excludeId: excludeOrderId,
  });
  if (existing) {
    return {
      ok: false,
      status: 409,
      message: 'Order already exists for this payment',
      existing_order_id: existing.order_id,
    };
  }

  const verification = await verifyPortOnePaymentForOrder({
    imp_uid: portone.imp_uid,
    merchant_uid: portone.merchant_uid,
    amount: expectedTotal,
  });

  if (!verification.ok) {
    return {
      ok: false,
      status: 400,
      message: verification.message,
      code: verification.code,
    };
  }

  if (!verification.skipped) {
    if (verification.status) {
      portone.status = verification.status;
    }
    if (Number.isFinite(verification.paidAmount)) {
      portone.paid_amount = verification.paidAmount;
    }
  }

  return { ok: true };
}

async function findUserOrder(userId, orderMongoId) {
  return Order.findOne({ _id: orderMongoId, user: userId });
}

function listMeta(page, limit, total) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}

// —— 고객 ——

/** 결제 중복·포트원 검증 (주문 생성 전) */
export async function validatePaymentBeforeOrder(req, res) {
  const portone = readPortOneResult(req.body);
  if (!portone) {
    return res.status(400).json({ message: 'portone.imp_uid is required' });
  }

  const expectedTotal = Number(req.body?.expected_total);
  if (!Number.isFinite(expectedTotal) || expectedTotal < 0) {
    return res.status(400).json({ message: 'expected_total must be a non-negative number' });
  }

  const safe = await ensurePortOnePaymentSafe(portone, expectedTotal);
  if (!safe.ok) {
    const body = { message: safe.message };
    if (safe.existing_order_id) {
      body.existing_order_id = safe.existing_order_id;
      body.duplicate = true;
    }
    return res.status(safe.status).json(body);
  }

  res.json({
    valid: true,
    portone: {
      imp_uid: portone.imp_uid,
      merchant_uid: portone.merchant_uid,
      paid_amount: portone.paid_amount,
      status: portone.status,
    },
  });
}

async function snapshotCartOrder(req) {
  const shipping = normalizeShippingInput(req.body);
  if (!shipping) {
    return {
      error: {
        status: 400,
        message:
          'shipping.recipient_name, shipping.phone, and shipping.address are required',
      },
    };
  }

  const paymentMethod = resolvePaymentMethod(req.body?.payment_method);
  if (paymentMethod === null) {
    return {
      error: {
        status: 400,
        message: `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}`,
      },
    };
  }

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart || cart.items.length === 0) {
    return { error: { status: 400, message: 'Cart is empty' } };
  }

  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((p) => [p._id.toString(), p]));

  const built = buildOrderItemsFromCart(cart, productsById);
  if (built.error) {
    return { error: { status: 400, message: built.error } };
  }

  const merchant_uid = generateOrderId();
  const intentPayload = {
    merchant_uid,
    user: req.userId,
    items: built.items,
    total: built.total,
    payment_method: paymentMethod,
    shipping,
  };

  return { cart, merchant_uid, intentPayload, paymentMethod, total: built.total };
}

/** 결제창 열기 전: 장바구니 스냅샷만 임시 저장. 주문은 결제 완료 후 생성 */
export async function prepareMyCheckout(req, res) {
  const snap = await snapshotCartOrder(req);
  if (snap.error) {
    return res.status(snap.error.status).json({ message: snap.error.message });
  }

  try {
    const intent = await CheckoutIntent.create(snap.intentPayload);
    return res.status(201).json({
      checkout_id: intent._id,
      merchant_uid: intent.merchant_uid,
      amount: intent.total,
      order: {
        _id: intent._id,
        order_id: intent.merchant_uid,
        total: intent.total,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      snap.intentPayload.merchant_uid = generateOrderId();
      try {
        const intent = await CheckoutIntent.create(snap.intentPayload);
        return res.status(201).json({
          checkout_id: intent._id,
          merchant_uid: intent.merchant_uid,
          amount: intent.total,
          order: {
            _id: intent._id,
            order_id: intent.merchant_uid,
            total: intent.total,
          },
        });
      } catch (retryErr) {
        return handleOrderError(retryErr, res);
      }
    }
    return handleOrderError(err, res);
  }
}

/** PG 승인 후 포트원 검증 → 결제 완료 주문 생성. 실패 시 결제만 취소 */
export async function confirmMyOrder(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  const portone = readPortOneResult(req.body);
  if (!portone) {
    return res.status(400).json({ message: 'portone.imp_uid is required' });
  }

  const existingOrder = await findUserOrder(req.userId, id);
  if (existingOrder && isAlreadyFulfilled(existingOrder, portone.imp_uid)) {
    return res.json({ order: existingOrder, already: true });
  }

  const intent = await CheckoutIntent.findOne({ _id: id, user: req.userId });
  if (!intent) {
    const byPay = await Order.findOne({
      user: req.userId,
      $or: [
        { 'payment.transaction_id': portone.imp_uid },
        portone.merchant_uid
          ? { 'payment.merchant_uid': portone.merchant_uid }
          : null,
      ].filter(Boolean),
    });
    if (byPay) return res.json({ order: byPay, already: true });
    return res.status(404).json({ message: 'Order not found' });
  }

  const expectedMerchant = intent.merchant_uid;
  if (portone.merchant_uid && portone.merchant_uid !== expectedMerchant) {
    const refund = await refundAndCancelOrder(
      null,
      portone,
      'merchant_uid does not match this order'
    );
    await CheckoutIntent.deleteOne({ _id: intent._id });
    return res.status(400).json({
      message: 'merchant_uid does not match this order',
      refunded: refund.refunded,
      order_id: expectedMerchant,
    });
  }

  portone.merchant_uid = expectedMerchant;

  const safe = await ensurePortOnePaymentSafe(portone, intent.total);
  if (!safe.ok) {
    if (safe.existing_order_id) {
      await CheckoutIntent.deleteOne({ _id: intent._id });
      return res.status(409).json({
        message: safe.message,
        duplicate: true,
        existing_order_id: safe.existing_order_id,
      });
    }

    const shouldRefund = AUTO_REFUND_CODES.has(safe.code);
    if (shouldRefund) {
      const refund = await refundAndCancelOrder(null, portone, safe.message);
      await CheckoutIntent.deleteOne({ _id: intent._id });
      return res.status(400).json({
        message: safe.message,
        refunded: refund.refunded,
        order_id: expectedMerchant,
        verifying: !refund.refunded,
      });
    }

    return res.status(400).json({
      message: safe.message,
      order_id: expectedMerchant,
      verifying: true,
    });
  }

  try {
    const order = await createPaidOrderFromCheckout(intent, portone);
    return res.json({ order });
  } catch (err) {
    const refund = await refundAndCancelOrder(
      null,
      portone,
      '주문 저장 실패로 결제를 취소합니다'
    );
    await CheckoutIntent.deleteOne({ _id: intent._id });
    return res.status(500).json({
      message: refund.refunded
        ? '주문 저장에 실패해 결제를 자동 취소했습니다.'
        : '주문 저장에 실패했습니다. 결제 상태를 주문내역에서 확인해 주세요.',
      refunded: refund.refunded,
      order_id: expectedMerchant,
    });
  }
}

/** 장바구니 기준 주문 생성 */
export async function createMyOrder(req, res) {
  const shipping = normalizeShippingInput(req.body);
  if (!shipping) {
    return res.status(400).json({
      message:
        'shipping.recipient_name, shipping.phone, and shipping.address are required',
    });
  }

  const paymentMethod = resolvePaymentMethod(req.body?.payment_method);
  if (paymentMethod === null) {
    return res.status(400).json({
      message: `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}`,
    });
  }

  const clearCart = req.body?.clear_cart !== false;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((p) => [p._id.toString(), p]));

  const built = buildOrderItemsFromCart(cart, productsById);
  if (built.error) {
    return res.status(400).json({ message: built.error });
  }

  const order_id = generateOrderId();
  const orderPayload = {
    order_id,
    user: req.userId,
    items: built.items,
    total: built.total,
    shipping,
    payment: { method: paymentMethod, merchant_uid: order_id },
  };

  const portone = readPortOneResult(req.body);

  if (portone) {
    const safe = await ensurePortOnePaymentSafe(portone, built.total);
    if (!safe.ok) {
      if (portone.imp_uid && !safe.existing_order_id) {
        await refundAndCancelOrder(null, portone, safe.message);
      }
      const body = { message: safe.message, refunded: !safe.existing_order_id };
      if (safe.existing_order_id) {
        body.existing_order_id = safe.existing_order_id;
        body.duplicate = true;
        body.refunded = false;
      }
      return res.status(safe.status).json(body);
    }
    applyPortOnePayment(orderPayload, paymentMethod, portone);
  } else if (paymentMethod === 'mock') {
    applyMockPayment(orderPayload, order_id);
  } else {
    return res.status(400).json({
      message: '결제가 완료된 뒤에만 주문을 저장할 수 있습니다.',
    });
  }

  if (orderPayload.status !== ORDER_STATUS.PAID) {
    if (portone?.imp_uid) {
      await refundAndCancelOrder(null, portone, '결제가 완료되지 않아 주문을 만들지 않습니다');
    }
    return res.status(400).json({
      message: '결제가 완료된 뒤에만 주문을 저장할 수 있습니다.',
    });
  }

  try {
    const order = await Order.create(orderPayload);

    if (clearCart) {
      cart.items = [];
      await cart.save();
    }

    res.status(201).json({ order });
  } catch (err) {
    if (err.code === 11000) {
      const retryId = generateOrderId();
      orderPayload.order_id = retryId;
      if (portone) {
        applyPortOnePayment(orderPayload, paymentMethod, portone);
      } else if (paymentMethod === 'mock') {
        orderPayload.payment.transaction_id = `MOCK-${retryId}`;
      }
      try {
        const order = await Order.create(orderPayload);
        if (clearCart) {
          cart.items = [];
          await cart.save();
        }
        return res.status(201).json({ order });
      } catch (retryErr) {
        if (portone?.imp_uid) {
          await refundAndCancelOrder(null, portone, '주문 저장 실패로 결제를 취소합니다');
        }
        return handleOrderError(retryErr, res);
      }
    }
    if (portone?.imp_uid) {
      await refundAndCancelOrder(null, portone, '주문 저장 실패로 결제를 취소합니다');
    }
    return handleOrderError(err, res);
  }
}

/** 내 주문 목록 */
export async function listMyOrders(req, res) {
  await stripInvoiceUntilShipped();
  const { page, limit, skip, status } = parseListQuery(req.query);
  const filter = { user: req.userId };

  if (status) {
    if (!ORDER_STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${ORDER_STATUS_VALUES.join(', ')}`,
      });
    }
    filter.status = status;
  }

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  res.json({
    orders,
    meta: listMeta(page, limit, total),
  });
}

/** 내 주문 상세 */
export async function getMyOrder(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  let order = await findUserOrder(req.userId, id);
  if (!order) {
    const intent = await CheckoutIntent.findOne({ _id: id, user: req.userId });
    if (intent) {
      order = await Order.findOne({
        user: req.userId,
        $or: [
          { 'payment.merchant_uid': intent.merchant_uid },
          { order_id: intent.merchant_uid },
        ],
      });
    }
  }
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.json({ order });
}

/** 내 주문 취소. 결제 전 체크아웃은 주문 없이 폐기 */
export async function cancelMyOrder(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  const intent = await CheckoutIntent.findOne({ _id: id, user: req.userId });
  if (intent) {
    await CheckoutIntent.deleteOne({ _id: intent._id });
    return res.json({ discarded: true });
  }

  const order = await findUserOrder(req.userId, id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!CANCELLABLE_STATUSES.has(order.status)) {
    return res.status(409).json({
      message: `Order cannot be cancelled in status: ${order.status}`,
    });
  }

  if (order.status === ORDER_STATUS.PENDING) {
    await Order.deleteOne({ _id: order._id });
    return res.json({ discarded: true });
  }

  const cancel_reason =
    typeof req.body?.cancel_reason === 'string'
      ? req.body.cancel_reason.trim() || null
      : null;

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelled_at = new Date();
  order.cancel_reason = cancel_reason;
  if (order.payment?.status === PAYMENT_STATUS.PAID) {
    order.payment.status = PAYMENT_STATUS.CANCELLED;
  } else if (order.payment) {
    order.payment.status = PAYMENT_STATUS.CANCELLED;
  }

  try {
    await order.save();
    res.json({ order });
  } catch (err) {
    return handleOrderError(err, res);
  }
}

// —— 관리자 ——

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function adminListScope(query) {
  return query?.scope === 'desk' ? 'desk' : 'lookup';
}

function baseAdminStatusFilter(scope) {
  if (scope === 'desk') {
    return { $in: [ORDER_STATUS.PAID] };
  }
  return {
    $nin: [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.CANCELLED,
      ORDER_STATUS.REFUNDED,
    ],
  };
}

function buildAdminOrderFilter(query, { ignoreStatus = false } = {}) {
  const filter = {};
  const scope = adminListScope(query);

  if (!ignoreStatus) {
    const tab = typeof query.status === 'string' ? query.status.trim() : '';
    if (tab === 'cancel_done') {
      filter.status = { $in: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] };
    } else if (tab === 'cancel_request') {
      filter.status = { $in: [ORDER_STATUS.PAID, ORDER_STATUS.PREPARING] };
      filter.cancel_reason = { $nin: [null, ''] };
    } else if (tab === 'fulfillment') {
      filter.status = {
        $in: [
          ORDER_STATUS.PREPARING,
          ORDER_STATUS.SHIPPING,
          ORDER_STATUS.DELIVERED,
        ],
      };
    } else if (
      tab &&
      tab !== 'pending' &&
      tab !== 'cancelled' &&
      tab !== 'refunded' &&
      ORDER_STATUS_VALUES.includes(tab)
    ) {
      if (scope === 'desk' && tab !== ORDER_STATUS.PAID) {
        filter.status = { $in: [] };
      } else {
        filter.status = tab;
      }
    } else {
      filter.status = baseAdminStatusFilter(scope);
    }
  } else {
    filter.status = baseAdminStatusFilter(scope);
  }

  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { order_id: regex },
      { 'shipping.recipient_name': regex },
      { 'shipping.phone': regex },
      { 'shipping.tracking_number': regex },
      { 'shipping.carrier': regex },
    ];
  }

  const paymentMethod =
    typeof query.payment_method === 'string' ? query.payment_method.trim() : '';
  if (paymentMethod && PAYMENT_METHODS.includes(paymentMethod)) {
    if (paymentMethod === 'easy') {
      filter['payment.method'] = { $in: ['easy', 'mock'] };
    } else {
      filter['payment.method'] = paymentMethod;
    }
  }

  const dateFrom =
    typeof query.date_from === 'string' ? query.date_from.trim() : '';
  const dateTo = typeof query.date_to === 'string' ? query.date_to.trim() : '';
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      const start = new Date(dateFrom);
      if (!Number.isNaN(start.getTime())) filter.createdAt.$gte = start;
    }
    if (dateTo) {
      const end = new Date(dateTo);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  return filter;
}

async function computeAdminOrderStatusCounts(matchFilter) {
  const rows = await Order.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const cancelDone =
    (byStatus[ORDER_STATUS.CANCELLED] ?? 0) +
    (byStatus[ORDER_STATUS.REFUNDED] ?? 0);
  const cancelRequest = await Order.countDocuments({
    ...matchFilter,
    status: { $in: [ORDER_STATUS.PAID, ORDER_STATUS.PREPARING] },
    cancel_reason: { $nin: [null, ''] },
  });

  return {
    total,
    pending: byStatus[ORDER_STATUS.PENDING] ?? 0,
    paid: byStatus[ORDER_STATUS.PAID] ?? 0,
    preparing: byStatus[ORDER_STATUS.PREPARING] ?? 0,
    shipping: byStatus[ORDER_STATUS.SHIPPING] ?? 0,
    delivered: byStatus[ORDER_STATUS.DELIVERED] ?? 0,
    cancel_request: cancelRequest,
    cancel_done: cancelDone,
  };
}

/** 전체 주문 목록 */
export async function listOrders(req, res) {
  await stripInvoiceUntilShipped();
  const { page, limit, skip } = parseListQuery(req.query);
  const filter = buildAdminOrderFilter(req.query);
  const countFilter = buildAdminOrderFilter(req.query, { ignoreStatus: true });

  const [total, orders, statusCounts] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'user', select: 'email name user_type' }),
    computeAdminOrderStatusCounts(countFilter),
  ]);

  res.json({
    orders,
    meta: listMeta(page, limit, total),
    statusCounts,
  });
}

/** 주문 상세 (관리자) */
export async function getOrder(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  const order = await Order.findById(id).populate({
    path: 'user',
    select: 'email name user_type',
  });
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.json({ order });
}

function pickShippingUpdates(body) {
  if (!body?.shipping || typeof body.shipping !== 'object') return {};
  const allowed = [
    'recipient_name',
    'phone',
    'postal_code',
    'address',
    'address_detail',
    'memo',
    'carrier',
    'tracking_number',
    'shipped_at',
    'delivered_at',
  ];
  const out = {};
  for (const key of allowed) {
    if (body.shipping[key] === undefined) continue;
    out[key] = body.shipping[key];
  }
  return out;
}

function clearInvoiceUntilShipped(order) {
  if (!order?.shipping) return;
  order.shipping.carrier = null;
  order.shipping.tracking_number = null;
  order.shipping.shipped_at = null;
  order.shipping.delivered_at = null;
  order.markModified('shipping');
}

async function stripInvoiceUntilShipped() {
  await Order.updateMany(
    {
      status: { $in: [ORDER_STATUS.PAID, ORDER_STATUS.PREPARING] },
      $or: [
        { 'shipping.carrier': { $nin: [null, ''] } },
        { 'shipping.tracking_number': { $nin: [null, ''] } },
      ],
    },
    {
      $set: {
        'shipping.carrier': null,
        'shipping.tracking_number': null,
        'shipping.shipped_at': null,
        'shipping.delivered_at': null,
      },
    }
  );
}

function pickPaymentUpdates(body) {
  if (!body?.payment || typeof body.payment !== 'object') return {};
  const out = {};
  if (body.payment.status !== undefined) out.status = body.payment.status;
  if (body.payment.method !== undefined) out.method = body.payment.method;
  if (body.payment.paid_at !== undefined) out.paid_at = body.payment.paid_at;
  if (body.payment.transaction_id !== undefined) {
    out.transaction_id = body.payment.transaction_id;
  }
  return out;
}

/** 주문 수정 (상태·배송·결제) */
export async function updateOrder(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const { status, cancel_reason, fulfillment_note, rollback } = req.body ?? {};
  const shippingUpdates = pickShippingUpdates(req.body);
  const note =
    typeof fulfillment_note === 'string' ? fulfillment_note.trim() : '';

  const invoiceTouched =
    shippingUpdates.carrier !== undefined ||
    shippingUpdates.tracking_number !== undefined;
  if (invoiceTouched && order.status !== ORDER_STATUS.PREPARING) {
    return res.status(409).json({
      message: '송장은 상품준비중 단계에서만 입력할 수 있습니다.',
    });
  }

  if (status !== undefined) {
    if (!ORDER_STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${ORDER_STATUS_VALUES.join(', ')}`,
      });
    }

    const mergedShipping = {
      carrier:
        shippingUpdates.carrier !== undefined
          ? shippingUpdates.carrier
          : order.shipping?.carrier,
      tracking_number:
        shippingUpdates.tracking_number !== undefined
          ? shippingUpdates.tracking_number
          : order.shipping?.tracking_number,
    };
    const previousStatus = order.status;
    const transitionError = getFulfillmentTransitionError(
      previousStatus,
      status,
      mergedShipping,
      { rollback: rollback === true }
    );
    if (transitionError) {
      return res.status(409).json({ message: transitionError });
    }

    order.status = status;
    if (status === ORDER_STATUS.CANCELLED && !order.cancelled_at) {
      order.cancelled_at = new Date();
    }

    const prevRank = fulfillmentRank(previousStatus);
    const nextRank = fulfillmentRank(status);
    if (order.shipping && prevRank >= 0 && nextRank >= 0 && nextRank < prevRank) {
      if (nextRank <= fulfillmentRank(ORDER_STATUS.PREPARING)) {
        order.shipping.shipped_at = null;
      }
      if (nextRank <= fulfillmentRank(ORDER_STATUS.SHIPPING)) {
        order.shipping.delivered_at = null;
      }
      order.markModified('shipping');
    }

    if (
      status === ORDER_STATUS.PAID ||
      status === ORDER_STATUS.PREPARING
    ) {
      clearInvoiceUntilShipped(order);
    }

    if (
      status === ORDER_STATUS.SHIPPING &&
      previousStatus === ORDER_STATUS.PREPARING &&
      order.shipping &&
      !order.shipping.shipped_at
    ) {
      order.shipping.shipped_at = new Date();
    }
    if (
      status === ORDER_STATUS.DELIVERED &&
      order.shipping &&
      !order.shipping.delivered_at
    ) {
      order.shipping.delivered_at = new Date();
    }
    if (note) {
      order.fulfillment_note = note;
    }
  }

  if (cancel_reason !== undefined) {
    order.cancel_reason =
      typeof cancel_reason === 'string' ? cancel_reason.trim() || null : null;
  }

  if (Object.keys(shippingUpdates).length > 0) {
    Object.assign(order.shipping, shippingUpdates);
    order.markModified('shipping');
  }

  const paymentUpdates = pickPaymentUpdates(req.body);
  if (Object.keys(paymentUpdates).length > 0) {
    Object.assign(order.payment, paymentUpdates);
    order.markModified('payment');
  }

  try {
    await order.save();
    const populated = await Order.findById(order._id).populate({
      path: 'user',
      select: 'email name user_type',
    });
    res.json({ order: populated });
  } catch (err) {
    return handleOrderError(err, res);
  }
}

/** 주문 삭제 (관리자) */
export async function deleteOrder(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  const deleted = await Order.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.status(204).send();
}