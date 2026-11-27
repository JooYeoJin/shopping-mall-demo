export type WishlistProduct = {
  _id: string
  product_id: string
  name: string
  price: number
  image: { url: string }
  category: string
}

export type WishlistItemRecord = {
  _id: string
  product: WishlistProduct
}

export type WishlistRecord = {
  _id: string
  user: string
  items: WishlistItemRecord[]
}
