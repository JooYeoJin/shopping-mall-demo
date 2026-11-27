export const ADMIN_NAV = [
  {
    to: '/admin/dashboard',
    label: '대시보드',
    description: '운영 현황 요약',
  },
  {
    to: '/admin/products',
    label: '상품 관리',
    description: '상품·카테고리·재고',
  },
  {
    to: '/admin/orders',
    label: '주문 관리',
    description: '신규 주문 확인',
  },
  {
    to: '/admin/shipping',
    label: '배송 관리',
    description: '배송·송장',
  },
  {
    to: '/admin/order-lookup',
    label: '주문 조회',
    description: '전체 내역 검색',
  },
  {
    to: '/admin/members',
    label: '회원 관리',
    description: '회원 정보',
  },
] as const