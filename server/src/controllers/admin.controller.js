import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Order, ORDER_STATUS } from '../models/Order.js';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatYmdKst(date) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function currentKstYearMonth() {
  const todayKey = formatYmdKst(new Date());
  const [year, month] = todayKey.split('-').map(Number);
  return { year, month };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function startOfKstMonth(year, month) {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - KST_OFFSET_MS);
}

async function buildOrderTrend() {
  const { year, month } = currentKstYearMonth();
  const lastDay = daysInMonth(year, month);
  const mm = String(month).padStart(2, '0');
  const days = [];
  for (let d = 1; d <= lastDay; d += 1) {
    days.push(`${year}-${mm}-${String(d).padStart(2, '0')}`);
  }

  const since = startOfKstMonth(year, month);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
            timezone: 'Asia/Seoul',
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row.count]));
  return {
    year,
    month,
    days: days.map((date) => ({ date, count: byDay.get(date) ?? 0 })),
  };
}

/** 운영 요약 */
export async function getAdminDashboardStats(_req, res) {
  const paidLikeStatuses = [
    ORDER_STATUS.PAID,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.SHIPPING,
    ORDER_STATUS.DELIVERED,
  ];

  const [
    totalCustomers,
    totalUsers,
    totalProducts,
    totalOrders,
    revenueAgg,
    orderTrend,
  ] = await Promise.all([
    User.countDocuments({ user_type: 'customer' }),
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: { $in: paidLikeStatuses } } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    ]),
    buildOrderTrend(),
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue ?? 0;

  res.json({
    stats: {
      totalOrders,
      totalProducts,
      totalCustomers,
      totalRevenue,
      totalUsers,
      orderTrend: orderTrend.days,
      orderTrendMonth: `${orderTrend.year}년 ${orderTrend.month}월`,
    },
  });
}