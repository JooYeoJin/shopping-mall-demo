function duplicateKeyField(err) {
  if (err?.keyPattern && typeof err.keyPattern === 'object') {
    return Object.keys(err.keyPattern)[0] || '';
  }
  const msg = typeof err?.message === 'string' ? err.message : '';
  if (msg.includes('transaction_id')) return 'payment.transaction_id';
  if (msg.includes('merchant_uid')) return 'payment.merchant_uid';
  if (msg.includes('order_id')) return 'order_id';
  return '';
}

export function handleOrderError(err, res) {
  if (err.code === 11000) {
    const field = duplicateKeyField(err);
    if (field.includes('transaction_id')) {
      return res.status(409).json({
        message: 'Payment already recorded for this transaction',
      });
    }
    if (field.includes('merchant_uid')) {
      return res.status(409).json({
        message: 'Payment already started for this merchant_uid',
      });
    }
    return res.status(409).json({ message: 'order_id already exists' });
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors: messages });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}