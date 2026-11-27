import { memo } from 'react'
import { ANNOUNCE_TEXT } from '@/config/homeContent'

function HomeAnnounceBarComponent() {
  return (
    <footer className="home-landing__announce">
      <p className="home-landing__announce-text">{ANNOUNCE_TEXT}</p>
      <button type="button" className="home-landing__fab" aria-label="브랜드">
        WB
      </button>
    </footer>
  )
}

export const HomeAnnounceBar = memo(HomeAnnounceBarComponent)