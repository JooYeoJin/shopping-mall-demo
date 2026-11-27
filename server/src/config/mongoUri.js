const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/shopping-mall-demo';

/** Atlas가 있으면 그걸 쓰고, 없을 때만 로컬 */
export function resolveMongoUri() {
  const atlas = process.env.MONGODB_ATLAS_URI?.trim();
  if (atlas) return atlas;
  return LOCAL_MONGO_URI;
}
