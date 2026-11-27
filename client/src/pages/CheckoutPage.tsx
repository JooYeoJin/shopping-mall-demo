import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { useCart } from '@/contexts/CartContext'
import { getAccessToken } from '@/lib/authStorage'
import { useSessionUser } from '@/hooks/useSessionUser'
import {
  fetchMyCart,
  removeCartItem,
  updateCartItem,
} from '@/services/cartService'
import {
  cancelMyOrder,
  confirmMyCheckout,
  prepareMyCheckout,
} from '@/services/orderService'
import type { OrderRecord } from '@/types/order'
import {
  initPortOnePayment,
  mapPayUiToOrderMethod,
  requestPortOnePayment,
  type PortOnePayUi,
} from '@/config/portone'
import { formatKrw } from '@/utils/format'
import { loadDaumPostcode, openDaumPostcode } from '@/utils/daumPostcode'
import './home.css'
import './shop.css'
import './checkout.css'

const MEMO_OPTIONS = [
  '배송 메모를 선택해 주세요',
  '문 앞에 놓아주세요',
  '경비실에 맡겨주세요',
  '배송 전 연락 부탁드립니다',
  '택배함에 넣어주세요',
] as const

const PAY_OPTIONS: { value: PortOnePayUi; label: string }[] = [
  { value: 'card', label: '신용카드' },
  { value: 'transfer', label: '실시간 계좌이체' },
  { value: 'easy', label: '간편결제' },
]

const PAY_DETAIL: Record<PortOnePayUi, string> = {
  card: '결제하기 클릭 시 포트원 결제창(카드)으로 이동합니다.',
  transfer: '실시간 계좌이체 결제창으로 이동합니다.',
  easy: '간편결제 창으로 이동합니다.',
  naver: '네이버페이 결제창으로 이동합니다.',
  kakao: '카카오페이 결제창으로 이동합니다.',
  toss: '토스페이 결제창으로 이동합니다.',
  bank:
    '무통장입금(가상계좌) 안내 화면으로 이동합니다. 입금 확인 후 주문이 완료됩니다.',
}

function formatPhoneInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

function payLabel(pay: PortOnePayUi): string {
  return PAY_OPTIONS.find((p) => p.value === pay)?.label ?? pay
}

type FieldErrors = Partial<
  Record<
    | 'customerName'
    | 'customerPhone'
    | 'customerEmail'
    | 'recipientName'
    | 'recipientPhone'
    | 'postal'
    | 'address',
    boolean
  >
>

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { sessionUser, clearSession } = useSessionUser()
  const { cart, setCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [cartBusyId, setCartBusyId] = useState<string | null>(null)
  const [cartMessage, setCartMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null)
  const [completedPayLabel, setCompletedPayLabel] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const [sameAsCustomer, setSameAsCustomer] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address, setAddress] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [memo, setMemo] = useState<string>(MEMO_OPTIONS[0])

  const [payMethod, setPayMethod] = useState<PortOnePayUi>('card')
  const [agreeAll, setAgreeAll] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreePurchase, setAgreePurchase] = useState(false)

  const requireLogin = !sessionUser || !getAccessToken()
  const itemCount = cart?.items.length ?? 0

  const total = useMemo(
    () =>
      cart?.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      ) ?? 0,
    [cart]
  )

  const qtyCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart]
  )

  const agreementsOk = agreePrivacy && agreePurchase
  const canSubmit =
    agreementsOk && !loading && !cartBusyId && itemCount > 0

  const handleCartUpdateQty = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1) return
      setCartBusyId(itemId)
      setCartMessage('')
      setError('')
      try {
        const next = await updateCartItem(itemId, quantity)
        setCart(next)
      } catch (err) {
        setCartMessage(
          err instanceof Error ? err.message : '수량 변경에 실패했습니다.'
        )
      } finally {
        setCartBusyId(null)
      }
    },
    [setCart]
  )

  const handleCartRemove = useCallback(
    async (itemId: string) => {
      setCartBusyId(itemId)
      setCartMessage('')
      setError('')
      try {
        const next = await removeCartItem(itemId)
        setCart(next)
      } catch (err) {
        setCartMessage(
          err instanceof Error ? err.message : '삭제에 실패했습니다.'
        )
      } finally {
        setCartBusyId(null)
      }
    },
    [setCart]
  )

  useEffect(() => {
    initPortOnePayment()
  }, [])

  useEffect(() => {
    if (requireLogin) return
    if (cart?.items.length) return
    let cancelled = false
    void fetchMyCart()
      .then((next) => {
        if (!cancelled) setCart(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [requireLogin, cart?.items.length, setCart])

  useEffect(() => {
    if (completedOrder || requireLogin) return
    if (cart && cart.items.length === 0) {
      navigate('/bag', { replace: true })
    }
  }, [cart, completedOrder, requireLogin, navigate])

  useEffect(() => {
    if (!sessionUser) return
    setCustomerName((v) => v || sessionUser.name)
    setCustomerEmail((v) => v || sessionUser.email)
    setRecipientName((v) => v || sessionUser.name)
    setAddress((v) => v || sessionUser.address?.trim() || '')
  }, [sessionUser])

  useEffect(() => {
    if (!sameAsCustomer) return
    setRecipientName(customerName)
    setRecipientPhone(customerPhone)
  }, [sameAsCustomer, customerName, customerPhone])

  const syncAgreeAll = useCallback((privacy: boolean, purchase: boolean) => {
    setAgreeAll(privacy && purchase)
  }, [])

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked)
    setAgreePrivacy(checked)
    setAgreePurchase(checked)
  }

  useEffect(() => {
    void loadDaumPostcode()
  }, [])

  const handleAddressSearch = async () => {
    setError('')
    try {
      const picked = await openDaumPostcode()
      if (!picked) return
      setPostalCode(picked.zonecode)
      setAddress(picked.address)
      setFieldErrors((e) => ({
        ...e,
        postal: false,
        address: false,
      }))
      document.getElementById('checkout-addr2')?.focus()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '우편번호 검색을 열 수 없습니다.'
      )
    }
  }

  const validate = (): boolean => {
    const next: FieldErrors = {}
    if (!customerName.trim()) next.customerName = true
    if (!customerPhone.trim()) next.customerPhone = true
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      next.customerEmail = true
    }
    if (!recipientName.trim()) next.recipientName = true
    if (!recipientPhone.trim()) next.recipientPhone = true
    if (!postalCode.trim()) next.postal = true
    if (!address.trim()) next.address = true

    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const resolveMemo = (): string | undefined => {
    if (memo === MEMO_OPTIONS[0]) return undefined
    return memo
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreementsOk) {
      setError('주문 내용 확인 및 필수 동의 항목을 체크해 주세요.')
      return
    }

    if (!validate()) {
      setError('필수 정보를 모두 입력해 주세요.')
      return
    }

    if (!cart?.items.length) {
      setError('장바구니가 비어 있습니다.')
      return
    }

    if (!initPortOnePayment()) {
      setError('결제 모듈을 초기화하지 못했습니다.')
      return
    }

    const firstName = cart.items[0]?.product.name ?? '상품'
    const orderName =
      cart.items.length > 1
        ? `${firstName} 외 ${cart.items.length - 1}건`
        : firstName

    const buyerAddr = [address.trim(), addressDetail.trim()]
      .filter(Boolean)
      .join(' ')

    setLoading(true)
    let paymentSucceeded = false
    try {
      const prepared = await prepareMyCheckout({
        shipping: {
          recipient_name: recipientName.trim(),
          phone: recipientPhone.trim(),
          postal_code: postalCode.trim() || undefined,
          address: address.trim(),
          address_detail: addressDetail.trim() || undefined,
          memo: resolveMemo(),
        },
        payment_method: mapPayUiToOrderMethod(payMethod),
      })
      const checkoutId = prepared.order._id

      let payResult
      try {
        payResult = await requestPortOnePayment({
          merchantUid: prepared.merchant_uid,
          name: orderName,
          amount: prepared.amount,
          payMethod,
          buyer: {
            email: customerEmail.trim(),
            name: customerName.trim(),
            tel: customerPhone.trim(),
            addr: buyerAddr || undefined,
            postcode: postalCode.trim() || undefined,
          },
        })
      } catch (payErr) {
        await cancelMyOrder(checkoutId, '결제창에서 취소됨').catch(
          () => undefined
        )
        throw payErr
      }

      paymentSucceeded = true
      const order = await confirmMyCheckout(checkoutId, {
        imp_uid: payResult.imp_uid,
        merchant_uid: payResult.merchant_uid,
        paid_amount: payResult.paid_amount,
        status: payResult.status,
      })

      if (order.status === 'cancelled' || order.status === 'refunded') {
        throw new Error(
          `결제가 확정되지 않아 주문이 취소되었습니다. 주문번호 ${order.order_id}`
        )
      }

      setCompletedPayLabel(payLabel(payMethod))
      setCompletedOrder(order)
      try {
        const nextCart = await fetchMyCart()
        setCart(nextCart)
      } catch {
        if (cart) setCart({ ...cart, items: [] })
      }
    } catch (err) {
      const base =
        err instanceof Error ? err.message : '주문 처리에 실패했습니다.'
      setError(
        paymentSucceeded
          ? `${base} 주문내역에서 해당 주문을 확인해 주세요.`
          : base
      )
    } finally {
      setLoading(false)
    }
  }

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((e) => ({ ...e, [key]: false }))
  }

  if (requireLogin) {
    return (
      <div className="shop-page checkout-page">
        <HomeLandingHeader
          sessionUser={sessionUser}
          onLoggedOut={clearSession}
        />
        <div className="checkout-wrap">
          <p className="shop-page__message">
            로그인 후 주문할 수 있습니다.{' '}
            <Link className="shop-page__inline-link" to="/login">
              Login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const step = completedOrder ? 'done' : 'order'

  if (completedOrder) {
    const shipLine = [
      address,
      addressDetail.trim(),
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="shop-page checkout-page checkout-view">
        <HomeLandingHeader
          sessionUser={sessionUser}
          onLoggedOut={clearSession}
        />
        <nav className="checkout-steps" aria-label="주문 단계">
          <Link className="checkout-step" to="/bag">
            01 BAG
          </Link>
          <span className="checkout-step">02 ORDER</span>
          <span className="checkout-step checkout-step--on">03 COMPLETE</span>
        </nav>
        <main className="checkout-wrap checkout-done">
          <div className="checkout-small-caps">Thank you</div>
          <h2>
            {completedOrder.status === 'paid'
              ? '주문이 완료되었습니다'
              : '주문이 접수되었습니다'}
          </h2>
          <p className="checkout-done__no">
            주문번호 <strong>{completedOrder.order_id}</strong>
          </p>
          <dl>
            <div>
              <dt>받는 분</dt>
              <dd>{completedOrder.shipping.recipient_name}</dd>
            </div>
            <div>
              <dt>배송지</dt>
              <dd>{shipLine || completedOrder.shipping.address}</dd>
            </div>
            <div>
              <dt>결제 수단</dt>
              <dd>{completedPayLabel}</dd>
            </div>
            <div>
              <dt>결제 금액</dt>
              <dd>{formatKrw(completedOrder.total)}</dd>
            </div>
          </dl>
          <div className="checkout-done__btns">
            <button
              type="button"
              className="checkout-btn checkout-btn--dark"
              onClick={() => navigate('/orders')}
            >
              주 문 내 역 확 인
            </button>
            <button
              type="button"
              className="checkout-btn checkout-btn--line"
              onClick={() => navigate('/')}
            >
              CONTINUE SHOPPING
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!cart || itemCount === 0) {
    return null
  }

  return (
    <div className="shop-page checkout-page checkout-view">
      <HomeLandingHeader sessionUser={sessionUser} onLoggedOut={clearSession} />

      <nav className="checkout-steps" aria-label="주문 단계">
        <Link
          className={`checkout-step ${step === 'order' ? '' : ''}`}
          to="/bag"
        >
          01 BAG
        </Link>
        <span className="checkout-step checkout-step--on">02 ORDER</span>
        <span className="checkout-step">03 COMPLETE</span>
      </nav>

      <main className="checkout-wrap checkout-wrap--wide">
        <Link className="checkout-back" to="/bag">
          ← BACK TO BAG
        </Link>

        <form
          id="checkout-form"
          className="checkout-order-grid"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <section className="checkout-block">
              <div className="checkout-block-head">
                <h2 className="checkout-eyebrow">Customer</h2>
                <span className="checkout-small-caps">주문자 정보</span>
              </div>
              <div className="checkout-two">
                <div className="checkout-field">
                  <label htmlFor="c-name">
                    이름<span className="checkout-req">*</span>
                  </label>
                  <input
                    className={`checkout-input${fieldErrors.customerName ? ' checkout-input--err' : ''}`}
                    id="c-name"
                    required
                    autoComplete="name"
                    value={customerName}
                    disabled={loading}
                    aria-invalid={fieldErrors.customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value)
                      clearFieldError('customerName')
                    }}
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="c-phone">
                    연락처<span className="checkout-req">*</span>
                  </label>
                  <input
                    className={`checkout-input${fieldErrors.customerPhone ? ' checkout-input--err' : ''}`}
                    id="c-phone"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="010-0000-0000"
                    value={customerPhone}
                    disabled={loading}
                    aria-invalid={fieldErrors.customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(formatPhoneInput(e.target.value))
                      clearFieldError('customerPhone')
                    }}
                  />
                </div>
              </div>
              <div className="checkout-field">
                <label htmlFor="c-email">
                  이메일<span className="checkout-req">*</span>
                </label>
                <input
                  className={`checkout-input${fieldErrors.customerEmail ? ' checkout-input--err' : ''}`}
                  id="c-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="주문 확인 메일이 발송됩니다"
                  value={customerEmail}
                  disabled={loading}
                  aria-invalid={fieldErrors.customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value)
                    clearFieldError('customerEmail')
                  }}
                />
              </div>
            </section>

            <section className="checkout-block">
              <div className="checkout-block-head">
                <h2 className="checkout-eyebrow">Shipping</h2>
                <label className="checkout-check">
                  <input
                    type="checkbox"
                    checked={sameAsCustomer}
                    onChange={(e) => setSameAsCustomer(e.target.checked)}
                  />
                  주문자와 동일
                </label>
              </div>
              <div className="checkout-two">
                <div className="checkout-field">
                  <label htmlFor="s-name">
                    받는 분<span className="checkout-req">*</span>
                  </label>
                  <input
                    className={`checkout-input${fieldErrors.recipientName ? ' checkout-input--err' : ''}`}
                    id="s-name"
                    required
                    value={recipientName}
                    disabled={loading || sameAsCustomer}
                    aria-invalid={fieldErrors.recipientName}
                    onChange={(e) => {
                      setRecipientName(e.target.value)
                      clearFieldError('recipientName')
                    }}
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="s-phone">
                    연락처<span className="checkout-req">*</span>
                  </label>
                  <input
                    className={`checkout-input${fieldErrors.recipientPhone ? ' checkout-input--err' : ''}`}
                    id="s-phone"
                    required
                    inputMode="tel"
                    placeholder="010-0000-0000"
                    value={recipientPhone}
                    disabled={loading || sameAsCustomer}
                    aria-invalid={fieldErrors.recipientPhone}
                    onChange={(e) => {
                      setRecipientPhone(formatPhoneInput(e.target.value))
                      clearFieldError('recipientPhone')
                    }}
                  />
                </div>
              </div>
              <div className="checkout-field">
                <label htmlFor="s-zip">
                  주소<span className="checkout-req">*</span>
                </label>
                <div className="checkout-inline">
                  <input
                    className={`checkout-input${fieldErrors.postal ? ' checkout-input--err' : ''}`}
                    id="s-zip"
                    required
                    placeholder="우편번호"
                    readOnly
                    value={postalCode}
                    aria-invalid={fieldErrors.postal}
                  />
                  <button
                    type="button"
                    className="checkout-btn-sm"
                    disabled={loading}
                    onClick={() => void handleAddressSearch()}
                  >
                    주소 검색
                  </button>
                </div>
              </div>
              <div className="checkout-field">
                <input
                  className={`checkout-input${fieldErrors.address ? ' checkout-input--err' : ''}`}
                  id="s-addr"
                  required
                  placeholder="기본 주소"
                  readOnly
                  value={address}
                  aria-label="기본 주소"
                  aria-invalid={fieldErrors.address}
                />
              </div>
              <div className="checkout-field">
                <input
                  className="checkout-input"
                  id="checkout-addr2"
                  placeholder="상세 주소 (동, 호수)"
                  autoComplete="address-line2"
                  value={addressDetail}
                  disabled={loading}
                  onChange={(e) => setAddressDetail(e.target.value)}
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="s-memo">배송 메모</label>
                <select
                  className="checkout-input"
                  id="s-memo"
                  value={memo}
                  disabled={loading}
                  onChange={(e) => setMemo(e.target.value)}
                >
                  {MEMO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="checkout-block">
              <div className="checkout-block-head">
                <h2 className="checkout-eyebrow">Payment</h2>
                <span className="checkout-small-caps">결제 수단</span>
              </div>
              <fieldset className="checkout-pay-grid">
                <legend className="visually-hidden">결제 수단 선택</legend>
                {PAY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="checkout-pay">
                    <input
                      type="radio"
                      name="pay"
                      value={opt.value}
                      checked={payMethod === opt.value}
                      onChange={() => setPayMethod(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </fieldset>
              <div className="checkout-pay-detail">{PAY_DETAIL[payMethod]}</div>
            </section>
          </div>

          <aside className="checkout-summary-col" aria-label="주문 요약">
            <div className="checkout-summary-box">
              <div
                className="checkout-block-head"
                style={{ marginBottom: '6px' }}
              >
                <h2 className="checkout-eyebrow">Order Summary</h2>
                <span className="checkout-small-caps">{qtyCount} ITEMS</span>
              </div>
              {cartMessage ? (
                <p className="checkout-sum-message" role="status">
                  {cartMessage}
                </p>
              ) : null}
              {cart.items.map((item) => {
                const lineBusy = cartBusyId === item._id
                const lineDisabled = Boolean(cartBusyId)
                return (
                  <div key={item._id} className="checkout-sum-item">
                    <img src={item.product.image.url} alt="" />
                    <div className="checkout-sum-item__meta">
                      <div className="checkout-sum-item__name">
                        {item.product.name}
                      </div>
                      <div className="checkout-sum-item__unit">
                        {formatKrw(item.unit_price)}
                      </div>
                      <div className="checkout-sum-item__qty">
                        <button
                          type="button"
                          disabled={lineDisabled || item.quantity <= 1}
                          aria-label={`${item.product.name} 수량 감소`}
                          onClick={() =>
                            void handleCartUpdateQty(
                              item._id,
                              item.quantity - 1
                            )
                          }
                        >
                          −
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={lineDisabled}
                          aria-label={`${item.product.name} 수량 증가`}
                          onClick={() =>
                            void handleCartUpdateQty(
                              item._id,
                              item.quantity + 1
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="checkout-sum-item__remove"
                        disabled={lineDisabled}
                        onClick={() => void handleCartRemove(item._id)}
                      >
                        REMOVE
                      </button>
                    </div>
                    <div
                      className={`checkout-sum-item__p${
                        lineBusy ? ' checkout-sum-item__p--busy' : ''
                      }`}
                    >
                      {formatKrw(item.unit_price * item.quantity)}
                    </div>
                  </div>
                )
              })}
              <div className="checkout-lines">
                <div>
                  <span className="checkout-lines__muted">상품 금액</span>
                  <span>{formatKrw(total)}</span>
                </div>
                <div>
                  <span className="checkout-lines__muted">배송비</span>
                  <span>무료</span>
                </div>
                <div>
                  <span className="checkout-lines__muted">할인</span>
                  <span>{formatKrw(0)}</span>
                </div>
              </div>
              <div className="checkout-grand">
                <span className="checkout-eyebrow">Total</span>
                <span className="checkout-grand__amt">{formatKrw(total)}</span>
              </div>
              <div className="checkout-agree">
                <label className="checkout-check">
                  <input
                    type="checkbox"
                    checked={agreeAll}
                    onChange={(e) => handleAgreeAll(e.target.checked)}
                  />
                  주문 내용 확인 및 전체 동의
                </label>
                <div className="checkout-agree__sub">
                  <label className="checkout-check">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => {
                        setAgreePrivacy(e.target.checked)
                        syncAgreeAll(e.target.checked, agreePurchase)
                      }}
                    />
                    (필수) 개인정보 수집 · 이용 동의
                  </label>
                  <label className="checkout-check">
                    <input
                      type="checkbox"
                      checked={agreePurchase}
                      onChange={(e) => {
                        setAgreePurchase(e.target.checked)
                        syncAgreeAll(agreePrivacy, e.target.checked)
                      }}
                    />
                    (필수) 구매 조건 확인 및 결제 진행 동의
                  </label>
                </div>
              </div>
              <button
                type="submit"
                className="checkout-btn checkout-btn--dark"
                disabled={!canSubmit}
              >
                {loading
                  ? '처리 중…'
                  : `${formatKrw(total)}  결제하기`}
              </button>
              <p className="checkout-error" role="alert">
                {error}
              </p>
              <p className="checkout-note">배송비는 별도로 부과되지 않습니다</p>
            </div>
          </aside>
        </form>
      </main>
    </div>
  )
}