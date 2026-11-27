import { Product } from '../models/Product.js';
import { Wishlist } from '../models/Wishlist.js';
import { isValidObjectId } from '../utils/objectId.js';

const PRODUCT_POPULATE = {
  path: 'items.product',
  select: 'product_id name price image category',
};

async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }
  return wishlist;
}

async function populateWishlist(wishlist) {
  await wishlist.populate(PRODUCT_POPULATE);
  wishlist.items = wishlist.items.filter((item) => item.product);
  return wishlist;
}

export async function getMyWishlist(req, res) {
  const wishlist = await getOrCreateWishlist(req.userId);
  await populateWishlist(wishlist);
  res.json({ wishlist });
}

export async function toggleWishlistItem(req, res) {
  const productId = req.body?.product;
  if (!productId || !isValidObjectId(productId)) {
    return res.status(400).json({ message: 'Valid product id is required' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const wishlist = await getOrCreateWishlist(req.userId);
  const existing = wishlist.items.find((item) => item.product.equals(product._id));

  if (existing) {
    wishlist.items = wishlist.items.filter(
      (item) => !item.product.equals(product._id)
    );
  } else {
    wishlist.items.push({ product: product._id });
  }

  await wishlist.save();
  await populateWishlist(wishlist);
  res.json({ wishlist, wished: !existing });
}

export async function removeWishlistItem(req, res) {
  const { productId } = req.params;
  if (!isValidObjectId(productId)) {
    return res.status(400).json({ message: 'Invalid product id' });
  }

  const wishlist = await getOrCreateWishlist(req.userId);
  wishlist.items = wishlist.items.filter(
    (item) => !item.product.equals(productId)
  );
  await wishlist.save();
  await populateWishlist(wishlist);
  res.json({ wishlist });
}
