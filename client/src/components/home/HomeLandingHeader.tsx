import { memo } from 'react'
import { Link } from 'react-router-dom'
import { HeaderUserNav } from '@/components/layout/HeaderUserNav'
import { ShopNavDropdown } from '@/components/home/ShopNavDropdown'
import { useCart } from '@/contexts/CartContext'
import { NAV_LEFT } from '@/config/homeContent'
import type { UserRecord } from '@/types/user'

type Props = {
  sessionUser: UserRecord | null
  onLoggedOut: () => void
}

function HomeLandingHeaderComponent({ sessionUser, onLoggedOut }: Props) {
  const { itemCount } = useCart()

  return (
    <header className="home-landing__nav home-landing__nav--bar">
      <nav className="home-landing__nav-left" aria-label="주 메뉴">
        {NAV_LEFT.map((label) =>
          label === 'Shop' ? (
            <ShopNavDropdown key={label} />
          ) : (
            <button key={label} type="button" className="home-landing__nav-link">
              {label}
            </button>
          )
        )}
        <button type="button" className="home-landing__nav-link">
          Search
        </button>
      </nav>

      <h1 className="home-landing__logo">
        <Link className="home-landing__logo-link" to="/">
          WITHBLOOMING
        </Link>
      </h1>

      <nav className="home-landing__nav-right" aria-label="유틸리티">
        {sessionUser ? (
          <>
            <span className="header-user-nav__welcome">
              {sessionUser.name}님 환영합니다
            </span>
            <Link
              className="home-landing__nav-link home-landing__nav-wish"
              to="/wishlist"
              aria-label="위시리스트"
            >
              ♡
            </Link>
            <Link className="home-landing__nav-link" to="/bag">
              Bag : {itemCount}
            </Link>
            <HeaderUserNav user={sessionUser} onLoggedOut={onLoggedOut} />
          </>
        ) : (
          <>
            <Link className="home-landing__nav-link" to="/login">
              Login
            </Link>
            <Link
              className="home-landing__nav-link home-landing__nav-wish"
              to="/wishlist"
              aria-label="위시리스트"
            >
              ♡
            </Link>
            <Link className="home-landing__nav-link" to="/bag">
              Bag : {itemCount}
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}

export const HomeLandingHeader = memo(HomeLandingHeaderComponent)