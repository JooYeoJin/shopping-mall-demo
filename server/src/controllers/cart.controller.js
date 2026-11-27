import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { handleCartError } from '../utils/cartError.js';
import { isValidObjectId } from '../utils/objectId.js';

const PRODUCT_POPULATE = {
  path: 'items.product',
  select: 'product_id name price image category',
};

function parseQuantity(value) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 1) return null;
  return Math.floor(num);
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

async function populateCart(cart) {
  await cart.populate(PRODUCT_POPULATE);
  return cart;
}

// 내 장바구니 조회
export async function getMyCart(req, res) {
  const cart = await getOrCreateCart(req.userId);
  await populateCart(cart);
  res.json({ cart });
}

// 장바구니 비우기 (문서 유지, items만 삭제)
export async function clearMyCart(req, res) {
  const cart = await getOrCreateCart(req.userId);
  cart.items = [];
  await cart.save();
  await populateCart(cart);
  res.json({ cart });
}

// 장바구니 문서 삭제
export async function deleteMyCart(req, res) {
  await Cart.findOneAndDelete({ user: req.userId });
  res.status(204).send();
}

// 품목 추가
export async function addCartItem(req, res) {
  const { product: productId, quantity: quantityRaw } = req.body;

  if (!productId || !isValidObjectId(productId)) {
    return res.status(400).json({ message: 'Valid product id is required' });
  }

  const quantity = parseQuantity(quantityRaw ?? 1);
  if (quantity === null) {
    return res.status(400).json({ message: 'quantity must be at least 1' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  try {
    const cart = await getOrCreateCart(req.userId);
    const existing = cart.items.find((item) =>
      item.product.equals(product._id)
    );

    if (existing) {
      existing.quantity += quantity;
      existing.unit_price = product.price;
    } else {
      cart.items.push({
        product: product._id,
        quantity,
        unit_price: product.price,
      });
    }

    await cart.save();
    await populateCart(cart);
    res.status(201).json({ cart });
  } catch (err) {
    return handleCartError(err, res);
  }
}

// 품목 수량 수정
export async function updateCartItem(req, res) {
  const { itemId } = req.params;
  const { quantity: quantityRaw } = req.body;

  if (!isValidObjectId(itemId)) {
    return res.status(400).json({ message: 'Invalid item id' });
  }

  const quantity = parseQuantity(quantityRaw);
  if (quantity === null) {
    return res.status(400).json({ message: 'quantity must be at least 1' });
  }

  try {
    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    item.quantity = quantity;

    const product = await Product.findById(item.product);
    if (product) {
      item.unit_price = product.price;
    }

    await cart.save();
    await populateCart(cart);
    res.json({ cart });
  } catch (err) {
    return handleCartError(err, res);
  }
}

// 품목 삭제
export async function removeCartItem(req, res) {
  const { itemId } = req.params;

  if (!isValidObjectId(itemId)) {
    return res.status(400).json({ message: 'Invalid item id' });
  }

  try {
    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    item.deleteOne();
    await cart.save();
    await populateCart(cart);
    res.json({ cart });
  } catch (err) {
    return handleCartError(err, res);
  }
}