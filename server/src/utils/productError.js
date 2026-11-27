export function handleProductError(err, res) {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors: messages });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'product_id already exists' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}