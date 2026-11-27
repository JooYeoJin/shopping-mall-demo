import mongoose from 'mongoose';
import { ensureHashedPassword, isBcryptHash } from '../utils/password.js';

const USER_TYPES = ['customer', 'admin'];
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        EMAIL_FORMAT_PATTERN,
        'Please provide a valid email address (e.g. user@example.com)',
      ],
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'password is required'],
      select: false,
    },
    user_type: {
      type: String,
      required: [true, 'user_type is required'],
      enum: {
        values: USER_TYPES,
        message: '{VALUE} is not a valid user_type',
      },
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

async function hashPasswordInUpdate(update) {
  if (!update || typeof update !== 'object') return;

  const plain =
    update.password ??
    (update.$set && update.$set.password);

  if (plain === undefined) return;

  if (isBcryptHash(plain)) return;

  const hashed = await ensureHashedPassword(plain);

  if (update.$set) {
    update.$set.password = hashed;
  } else {
    update.password = hashed;
  }
}

userSchema.pre('save', async function savePasswordHash() {
  if (!this.password || isBcryptHash(this.password)) return;
  this.password = await ensureHashedPassword(this.password);
});

userSchema.pre('findOneAndUpdate', async function findOneAndUpdatePasswordHash() {
  await hashPasswordInUpdate(this.getUpdate());
});

userSchema.pre('updateOne', async function updateOnePasswordHash() {
  await hashPasswordInUpdate(this.getUpdate());
});

export const USER_TYPE = Object.freeze({
  CUSTOMER: 'customer',
  ADMIN: 'admin',
});

export const User = mongoose.model('User', userSchema);