import mongoose from 'mongoose';
import { PAYMENT_METHODS } from './Order.js';

const checkoutIntentSchema = new mongoose.Schema(
  {
    merchant_uid: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [mongoose.Schema.Types.Mixed],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'checkout must have at least one item',
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    payment_method: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS,
    },
    shipping: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    collection: 'checkout_intents',
  }
);

checkoutIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
checkoutIntentSchema.index({ user: 1, createdAt: -1 });

export const CheckoutIntent = mongoose.model(
  'CheckoutIntent',
  checkoutIntentSchema
);
