/**
 * 기존 한글 category → TOP, BOTTOM, DRESS, ACCESSORY 로 일괄 변경
 * 실행: node scripts/migrate-product-categories.js (server 폴더에서)
 */
import '../src/config/loadEnv.js';
import { connectDatabase } from '../src/config/database.js';
import { Product } from '../src/models/Product.js';
import { LEGACY_CATEGORY_TO_CODE } from '../src/utils/productCategory.js';
import { resolveMongoUri } from '../src/config/mongoUri.js';

async function main() {
  await connectDatabase(resolveMongoUri());

  const legacyValues = Object.keys(LEGACY_CATEGORY_TO_CODE);
  const products = await Product.find({ category: { $in: legacyValues } });

  if (products.length === 0) {
    console.log('마이그레이션할 상품이 없습니다.');
    process.exit(0);
  }

  let updated = 0;
  for (const product of products) {
    const prev = product.category;
    const next = LEGACY_CATEGORY_TO_CODE[prev];
    if (!next) continue;
    product.category = next;
    await product.save();
    updated += 1;
    console.log(`${product.product_id}: ${prev} → ${next}`);
  }

  console.log(`완료: ${updated}건 업데이트`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});