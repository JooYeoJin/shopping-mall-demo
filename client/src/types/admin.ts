export type AdminOrderTrendPoint = {
  date: string
  count: number
}

export type AdminDashboardStats = {
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  totalRevenue: number
  totalUsers?: number
  orderTrend?: AdminOrderTrendPoint[]
  orderTrendMonth?: string
}