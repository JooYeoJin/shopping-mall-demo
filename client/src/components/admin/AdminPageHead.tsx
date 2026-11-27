type Props = {
  title: string
  subtitle?: string
}

export function AdminPageHead({ title, subtitle }: Props) {
  return (
    <header className="admin-page-head">
      <h1 className="admin-page-head__title">{title}</h1>
      {subtitle ? <p className="admin-page-head__sub">{subtitle}</p> : null}
    </header>
  )
}