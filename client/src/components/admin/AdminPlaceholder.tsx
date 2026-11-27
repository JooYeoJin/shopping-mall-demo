type Props = {
  title: string
  body: string
}

export function AdminPlaceholder({ title, body }: Props) {
  return (
    <section className="admin-panel">
      <h2 className="admin-panel__title">{title}</h2>
      <p className="admin-panel__text">{body}</p>
    </section>
  )
}