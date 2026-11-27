import { Link, useLocation } from 'react-router-dom'
import { SHOP_CATEGORY_OPTIONS, shopCategoryPath } from '@/types/product'

export function ShopNavDropdown() {
  const location = useLocation()
  const shopActive = location.pathname.startsWith('/shop')

  return (
    <div
      className={`home-landing__nav-item home-landing__nav-item--dropdown${
        shopActive ? ' home-landing__nav-item--active' : ''
      }`}
    >
      <button
        type="button"
        className="home-landing__nav-link home-landing__nav-link--dropdown"
        aria-haspopup="true"
        aria-expanded={false}
      >
        Shop
      </button>
      <div
        className="home-landing__dropdown"
        role="menu"
        aria-label="Shop 카테고리"
      >
        <ul className="home-landing__dropdown-list">
          {SHOP_CATEGORY_OPTIONS.map(({ value, label }) => (
            <li key={value}>
              <Link
                className="home-landing__dropdown-link"
                role="menuitem"
                to={shopCategoryPath(value)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}