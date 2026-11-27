import mongoose from 'mongoose';
import { PRODUCT_CATEGORIES } from '../utils/productCategory.js';

/** 주문 진행 상태 */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  PREPARING: 'preparing',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});

export const ORDER_STATUS_VALUES = Object.freeze(Object.values(ORDER_STATUS));

/** 결제 상태 */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});

export const PAYMENT_STATUS_VALUES = Object.freeze(Object.values(PAYMENT_STATUS));

export const PAYMENT_METHODS = Object.freeze([
  'card',
  'transfer',
  'easy',
  'mock',
]);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'product is required'],
    },
    product_id: {
      type: String,
      required: [true, 'product_id snapshot is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'name snapshot is required'],
      trim: true,
    },
    image: {
      url: {
        type: String,
        required: [true, 'image url snapshot is required'],
        trim: true,
      },
    },
    category: {
      type: String,
      required: [true, 'category snapshot is required'],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [1, 'quantity must be at least 1'],
    },
    unit_price: {
      type: Number,
      required: [true, 'unit_price is required'],
      min: [0, 'unit_price must be at least 0'],
    },
    line_total: {
      type: Number,
      required: [true, 'line_total is required'],
      min: [0, 'line_total must be at least 0'],
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

const paymentSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: [true, 'payment status is required'],
      enum: {
        values: PAYMENT_STATUS_VALUES,
        message: '{VALUE} is not a valid payment status',
      },
      default: PAYMENT_STATUS.PENDING,
    },
    method: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method',
      },
      default: null,
    },
    paid_at: {
      type: Date,
      default: null,
    },
    transaction_id: {
      type: String,
      trim: true,
    },
    /** 포트원 merchant_uid (결제 요청 식별) */
    merchant_uid: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const shippingSchema = new mongoose.Schema(
  {
    recipient_name: {
      type: String,
      required: [true, 'recipient_name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'phone is required'],
      trim: true,
    },
    postal_code: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      required: [true, 'address is required'],
      trim: true,
    },
    address_detail: {
      type: String,
      trim: true,
      default: null,
    },
    memo: {
      type: String,
      trim: true,
      default: null,
    },
    carrier: {
      type: String,
      trim: true,
      default: null,
    },
    tracking_number: {
      type: String,
      trim: true,
      default: null,
    },
    shipped_at: {
      type: Date,
      default: null,
    },
    delivered_at: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: [true, 'order_id is required'],
      trim: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user is required'],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'order must have at least one item',
      },
    },
    /** 품목 합계 (배송비·할인 없음) */
    total: {
      type: Number,
      required: [true, 'total is required'],
      min: [0, 'total must be at least 0'],
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ORDER_STATUS_VALUES,
        message: '{VALUE} is not a valid order status',
      },
      default: ORDER_STATUS.PENDING,
    },
    payment: {
      type: paymentSchema,
      required: true,
      default: () => ({ status: PAYMENT_STATUS.PENDING }),
    },
    shipping: {
      type: shippingSchema,
      required: [true, 'shipping is required'],
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    cancel_reason: {
      type: String,
      trim: true,
      default: null,
    },
    /** 출고 취소·배송완료 되돌리기 등 운영 메모 */
    fulfillment_note: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index(
  { 'payment.transaction_id': 1 },
  {
    unique: true,
    name: 'payment.transaction_id_unique',
    partialFilterExpression: {
      'payment.transaction_id': { $exists: true, $type: 'string' },
    },
  }
);
orderSchema.index(
  { 'payment.merchant_uid': 1 },
  {
    unique: true,
    name: 'payment.merchant_uid_unique',
    partialFilterExpression: {
      'payment.merchant_uid': { $exists: true, $type: 'string' },
    },
  }
);

export const Order = mongoose.model('Order', orderSchema);

/** sparse unique + null 기본값이 미결제 주문 생성을 막던 인덱스를 교체 */
export async function repairOrderPaymentIndexes() {
  const col = Order.collection;
  await col.updateMany(
    { 'payment.transaction_id': null },
    { $unset: { 'payment.transaction_id': 1 } }
  );
  await col.updateMany(
    { 'payment.merchant_uid': null },
    { $unset: { 'payment.merchant_uid': 1 } }
  );

  const indexes = await col.indexes();
  const dropNames = new Set([
    'payment.transaction_id_1',
    'payment.merchant_uid_1',
  ]);
  for (const idx of indexes) {
    if (!idx.name || !dropNames.has(idx.name)) continue;
    try {
      await col.dropIndex(idx.name);
    } catch (err) {
      console.warn(`Could not drop index ${idx.name}:`, err.message);
    }
  }

  await Order.syncIndexes();
}

/** 결제 완료 전 pending·취소 건은 orders에 남기지 않는다 */
export async function purgeUnpaidOrders() {
  await Order.deleteMany({
    $or: [
      { status: ORDER_STATUS.PENDING },
      { 'payment.status': PAYMENT_STATUS.PENDING },
      { 'payment.status': PAYMENT_STATUS.FAILED },
      {
        status: ORDER_STATUS.CANCELLED,
        $and: [
          {
            $or: [
              { 'payment.paid_at': null },
              { 'payment.paid_at': { $exists: false } },
            ],
          },
          {
            $or: [
              { 'payment.transaction_id': { $exists: false } },
              { 'payment.transaction_id': null },
              { 'payment.transaction_id': '' },
            ],
          },
        ],
      },
    ],
  });
}