import mongoose from 'mongoose';
import {
  purgeUnpaidOrders,
  repairOrderPaymentIndexes,
} from '../models/Order.js';

export async function connectDatabase(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  await repairOrderPaymentIndexes();
  await purgeUnpaidOrders();
  console.log('MongoDB connected');
}