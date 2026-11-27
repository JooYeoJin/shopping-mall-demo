import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'product is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [1, 'quantity must be at least 1'],
      default: 1,
    },
    /** 담을 당시 단가 (상품 가격 변경 대비 스냅샷) */
    unit_price: {
      type: Number,
      required: [true, 'unit_price is required'],
      min: [0, 'unit_price must be at least 0'],
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user is required'],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

cartSchema.index({ user: 1 }, { unique: true });
cartSchema.index({ 'items.product': 1 });

export const Cart = mongoose.model('Cart', cartSchema);