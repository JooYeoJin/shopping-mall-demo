import { NavLink, Outlet, Link } from 'react-router-dom'
import { ADMIN_NAV } from '@/config/adminNav'
import '@/pages/admin/admin.css'

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <header className="admin-shell__top">
        <div>
          <Link className="site-brand site-brand--lg" to="/admin/dashboard">
            WITHBLOOMING
          </Link>
          <p className="admin-shell__top-title">Admin Console</p>
        </div>
        <div className="admin-shell__top-actions">
          <Link className="site-nav-link" to="/">
            스토어 보기
          </Link>
        </div>
      </header>

      <div className="admin-shell__body">
        <aside className="admin-shell__sidebar">
          <nav aria-label="관리 메뉴">
            <ul className="admin-shell__menu">
              {ADMIN_NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'admin-shell__menu-link',
                        isActive ? 'admin-shell__menu-link--active' : '',
                      ].join(' ')
                    }
                  >
                    {item.label}
                    <span className="admin-shell__menu-desc">
                      {item.description}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="admin-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}