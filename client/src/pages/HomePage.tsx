import { HomeAnnounceBar } from '@/components/home/HomeAnnounceBar'
import { HomeHeroTriptych } from '@/components/home/HomeHeroTriptych'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { useSessionUser } from '@/hooks/useSessionUser'
import './home.css'

export default function HomePage() {
  const { sessionUser, clearSession, loginFlash } = useSessionUser()

  return (
    <div className="home-landing">
      <HomeLandingHeader
        sessionUser={sessionUser}
        onLoggedOut={clearSession}
      />

      <HomeHeroTriptych />

      {loginFlash ? (
        <p className="home-landing__flash" role="status">
          {loginFlash}
        </p>
      ) : null}

      <HomeAnnounceBar />
    </div>
  )
}