import mongoose from 'mongoose';

import { PRODUCT_CATEGORIES } from '../utils/productCategory.js';

export { PRODUCT_CATEGORIES };

const productSchema = new mongoose.Schema(
  {
    product_id: {
      type: String,
      required: [true, 'product_id is required'],
      trim: true,
      unique: true,
    },
    image: {
      public_id: {
        type: String,
        required: [true, 'cloudinary public_id is required'],
        trim: true,
      },
      url: {
        type: String,
        required: [true, 'image url is required'],
        trim: true,
      },
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'price is required'],
      min: [0, 'price must be at least 0'],
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

export const Product = mongoose.model('Product', productSchema);