import { Product } from '../models/Product.js';
import {
  PRODUCT_CATEGORIES,
  resolveCategoryDbValue,
} from '../utils/productCategory.js';
import { nextProductIdForCategory } from '../utils/productId.js';
import { isValidObjectId } from '../utils/objectId.js';
import { handleProductError } from '../utils/productError.js';

function parsePrice(value) {
  if (value === undefined || value === null) return null;
  const raw =
    typeof value === 'number'
      ? String(value)
      : typeof value === 'string'
        ? value.trim().replace(/,/g, '').replace(/\s/g, '')
        : '';
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function normalizeImage(body) {
  const image = body?.image;
  if (!image || typeof image !== 'object') return null;

  const public_id =
    typeof image.public_id === 'string' ? image.public_id.trim() : '';
  const url = typeof image.url === 'string' ? image.url.trim() : '';

  if (!public_id || !url) return null;
  return { public_id, url };
}

function normalizeDescription(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

const DEFAULT_PAGE_SIZE = 7;
const MAX_PAGE_SIZE = 50;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseListQuery(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  let limit = Number.parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
  const skip = (page - 1) * limit;
  const name = typeof query.name === 'string' ? query.name.trim() : '';
  const category =
    typeof query.category === 'string' ? query.category.trim() : '';
  return { page, limit, skip, name, category };
}

// 상품 목록 조회 (페이지네이션)
export async function listProducts(req, res) {
  const { page, limit, skip, name, category } = parseListQuery(req.query);
  const filter = {};

  if (name) {
    filter.name = { $regex: escapeRegex(name), $options: 'i' };
  }

  if (category) {
    const dbCategory = resolveCategoryDbValue(category);
    if (!dbCategory) {
      return res.status(400).json({
        message: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
      });
    }
    filter.category = dbCategory;
  }

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  res.json({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

// 상품 단일 조회 (MongoDB _id)
export async function getProductById(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json({ product });
}

export async function getNextProductId(req, res) {
  const dbCategory = resolveCategoryDbValue(req.query.category);
  if (!dbCategory) {
    return res.status(400).json({
      message: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
    });
  }

  const product_id = await nextProductIdForCategory(dbCategory);
  return res.json({ product_id, category: dbCategory });
}

// 상품 생성
export async function createProduct(req, res) {
  const { product_id, name, price, category, description } = req.body;

  const trimmedProductId =
    typeof product_id === 'string' ? product_id.trim() : '';
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const image = normalizeImage(req.body);
  const parsedPrice = parsePrice(price);
  const normalizedDescription = normalizeDescription(description);

  if (!trimmedProductId || !trimmedName || !image || parsedPrice === null || !category) {
    return res.status(400).json({
      message:
        '상품 ID, 상품명, 이미지(public_id, url), 가격, 카테고리는 필수입니다.',
    });
  }

  const dbCategory = resolveCategoryDbValue(category);
  if (!dbCategory) {
    return res.status(400).json({
      message: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
    });
  }

  let productId = trimmedProductId;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const product = await Product.create({
        product_id: productId,
        image,
        name: trimmedName,
        price: parsedPrice,
        category: dbCategory,
        description: normalizedDescription,
      });
      return res.status(201).json({ product });
    } catch (err) {
      if (err.code === 11000 && attempt < 4) {
        const nextId = await nextProductIdForCategory(dbCategory);
        if (nextId) {
          productId = nextId;
          continue;
        }
      }
      return handleProductError(err, res);
    }
  }

  return res.status(409).json({ message: 'product_id already exists' });
}

// 상품 수정
export async function updateProduct(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const { product_id, name, price, category, description } = req.body;
  const updates = {};

  if (product_id !== undefined) {
    const trimmed =
      typeof product_id === 'string' ? product_id.trim() : '';
    if (!trimmed) {
      return res.status(400).json({ message: 'product_id cannot be empty' });
    }
    updates.product_id = trimmed;
  }

  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      return res.status(400).json({ message: 'name cannot be empty' });
    }
    updates.name = trimmed;
  }

  if (price !== undefined) {
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      return res.status(400).json({ message: 'price must be a non-negative number' });
    }
    updates.price = parsedPrice;
  }

  if (category !== undefined) {
    const dbCategory = resolveCategoryDbValue(category);
    if (!dbCategory) {
      return res.status(400).json({
        message: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
      });
    }
    updates.category = dbCategory;
  }

  if (description !== undefined) {
    updates.description = normalizeDescription(description);
  }

  if (req.body.image !== undefined) {
    const image = normalizeImage(req.body);
    if (!image) {
      return res.status(400).json({
        message: 'image must include public_id and url',
      });
    }
    updates.image = image;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    return handleProductError(err, res);
  }
}

// 상품 삭제
export async function deleteProduct(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.status(204).send();
}