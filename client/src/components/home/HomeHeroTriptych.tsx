import { memo } from 'react'
import { HERO_PANELS } from '@/config/homeContent'

function HomeHeroTriptychComponent() {
  return (
    <section className="home-landing__triptych" aria-label="메인 비주얼">
      {HERO_PANELS.map((panel, index) => (
        <figure key={panel.src} className="home-landing__panel">
          <img
            className="home-landing__panel-img"
            src={panel.src}
            alt={panel.alt}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
          />
          {panel.caption ? (
            <figcaption className="home-landing__panel-caption">
              {panel.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </section>
  )
}

export const HomeHeroTriptych = memo(HomeHeroTriptychComponent)