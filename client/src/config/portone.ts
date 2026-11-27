/** 포트원 고객사 식별코드 (가맹점 코드) */
export const PORTONE_IMP_MERCHANT_CODE =
  import.meta.env.VITE_PORTONE_IMP_CODE?.trim() ||
  import.meta.env.VITE_PORTONE_MERCHANT_UID?.trim() ||
  'imp75955362'

/** KG 이니시스 테스트 PG (포트원 콘솔 연동 전 기본값) */
const DEFAULT_PG =
  import.meta.env.VITE_PORTONE_PG?.trim() || 'html5_inicis.INIpayTest'

export type PortOnePayUi =
  | 'card'
  | 'easy'
  | 'naver'
  | 'kakao'
  | 'toss'
  | 'transfer'
  | 'bank'

export type PortOnePaymentSuccess = {
  success: true
  imp_uid: string
  merchant_uid: string
  paid_amount: number
  status: string
  pay_method?: string
  error_msg?: string
}

function stripPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * pay_method + pg는 쌍으로 맞춰야 함.
 * 간편결제 PG가 콘솔에 없으면 카드+이니시스 테스트로 폴백 (개발용).
 */
function mapPayUiToPortOneRequest(pay: PortOnePayUi): {
  pg: string
  pay_method: string
} {
  switch (pay) {
    case 'easy': {
      const kakao = import.meta.env.VITE_PORTONE_PG_KAKAO?.trim()
      if (kakao) return { pg: kakao, pay_method: 'kakaopay' }
      const naver = import.meta.env.VITE_PORTONE_PG_NAVER?.trim()
      if (naver) return { pg: naver, pay_method: 'naverpay' }
      return { pg: DEFAULT_PG, pay_method: 'card' }
    }
    case 'naver': {
      const pg = import.meta.env.VITE_PORTONE_PG_NAVER?.trim()
      if (pg) return { pg, pay_method: 'naverpay' }
      return { pg: DEFAULT_PG, pay_method: 'card' }
    }
    case 'kakao': {
      const pg = import.meta.env.VITE_PORTONE_PG_KAKAO?.trim()
      if (pg) return { pg, pay_method: 'kakaopay' }
      return { pg: DEFAULT_PG, pay_method: 'card' }
    }
    case 'toss': {
      const pg = import.meta.env.VITE_PORTONE_PG_TOSS?.trim()
      if (pg) return { pg, pay_method: 'tosspay' }
      return { pg: DEFAULT_PG, pay_method: 'card' }
    }
    case 'transfer':
      return { pg: DEFAULT_PG, pay_method: 'trans' }
    case 'bank':
      return { pg: DEFAULT_PG, pay_method: 'vbank' }
    case 'card':
    default:
      return { pg: DEFAULT_PG, pay_method: 'card' }
  }
}

/** 포트원 merchant_uid (결제 요청마다 유일해야 함) */
export function createPortOneMerchantUid(): string {
  const tail = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `WB-${Date.now().toString(36).toUpperCase()}-${tail}`
}

export function initPortOnePayment(): boolean {
  const imp = window.IMP
  if (!imp) {
    console.warn(
      '[PortOne] iamport.js가 로드되지 않았습니다. index.html CDN 스크립트를 확인하세요.'
    )
    return false
  }
  imp.init(PORTONE_IMP_MERCHANT_CODE)
  return true
}

export type RequestPortOnePaymentParams = {
  merchantUid: string
  name: string
  amount: number
  payMethod: PortOnePayUi
  buyer: {
    email: string
    name: string
    tel: string
    addr?: string
    postcode?: string
  }
}

/** 포트원 결제창 호출 */
export function requestPortOnePayment(
  params: RequestPortOnePaymentParams
): Promise<PortOnePaymentSuccess> {
  const imp = window.IMP
  if (!imp) {
    return Promise.reject(
      new Error('결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.')
    )
  }

  const { pg, pay_method } = mapPayUiToPortOneRequest(params.payMethod)
  // request_pay 파라미터: https://portone.gitbook.io/docs/api/payment/request_pay
  const requestParams: Record<string, unknown> = {
    pg,
    pay_method,
    merchant_uid: params.merchantUid,
    name: params.name.slice(0, 40) || 'WITHBLOOMING 주문',
    amount: params.amount,
    buyer_email: params.buyer.email,
    buyer_name: params.buyer.name,
    buyer_tel: stripPhone(params.buyer.tel),
  }

  if (params.buyer.addr) requestParams.buyer_addr = params.buyer.addr
  if (params.buyer.postcode) requestParams.buyer_postcode = params.buyer.postcode

  if (pay_method === 'vbank') {
    const due = new Date()
    due.setDate(due.getDate() + 1)
    requestParams.vbank_due = due
      .toISOString()
      .slice(0, 16)
      .replace('T', ' ')
  }

  return new Promise((resolve, reject) => {
    imp.request_pay(requestParams, (rsp) => {
      const response = rsp as Record<string, unknown>
      const success = response.success === true

      if (!success) {
        const msg =
          typeof response.error_msg === 'string' && response.error_msg
            ? response.error_msg
            : '결제가 취소되었습니다.'
        reject(new Error(msg))
        return
      }

      const imp_uid =
        typeof response.imp_uid === 'string' ? response.imp_uid : ''
      const merchant_uid =
        typeof response.merchant_uid === 'string'
          ? response.merchant_uid
          : params.merchantUid

      if (!imp_uid) {
        reject(new Error('결제 응답이 올바르지 않습니다. (imp_uid 없음)'))
        return
      }

      resolve({
        success: true,
        imp_uid,
        merchant_uid,
        paid_amount: Number(response.paid_amount) || params.amount,
        status:
          typeof response.status === 'string'
            ? response.status
            : pay_method === 'vbank'
              ? 'ready'
              : 'paid',
        pay_method:
          typeof response.pay_method === 'string'
            ? response.pay_method
            : pay_method,
      })
    })
  })
}

export function mapPayUiToOrderMethod(
  pay: PortOnePayUi
): 'card' | 'transfer' | 'easy' {
  if (pay === 'transfer' || pay === 'bank') return 'transfer'
  if (pay === 'easy' || pay === 'naver' || pay === 'kakao' || pay === 'toss') {
    return 'easy'
  }
  return 'card'
}