import { useState, type ReactNode } from 'react'

type Item = {
  id: string
  title: string
  content: ReactNode
}

type Props = {
  items: Item[]
}

export function ProductDetailAccordion({ items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="product-detail__accordion">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <section key={item.id} className="product-detail__accordion-item">
            <button
              type="button"
              className="product-detail__accordion-trigger"
              aria-expanded={isOpen}
              onClick={() => toggle(item.id)}
            >
              <span>{item.title}</span>
              <span className="product-detail__accordion-icon" aria-hidden>
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen ? (
              <div className="product-detail__accordion-panel">{item.content}</div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}