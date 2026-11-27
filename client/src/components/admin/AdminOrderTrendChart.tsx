import type { AdminOrderTrendPoint } from '@/types/admin'

type Props = {
  points: AdminOrderTrendPoint[]
}

function formatTick(date: string): string {
  const [, month, day] = date.split('-')
  return `${month}.${day}`
}

function yTicks(max: number): number[] {
  if (max <= 4) {
    return Array.from({ length: max + 1 }, (_, i) => i)
  }
  const step = Math.max(1, Math.ceil(max / 4))
  const ticks: number[] = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] !== max) ticks.push(max)
  return ticks
}

export function AdminOrderTrendChart({ points }: Props) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const ticks = yTicks(max)

  const padL = 36
  const padR = 12
  const padT = 18
  const padB = 48
  const plotW = 760
  const plotH = 108
  const width = padL + plotW + padR
  const height = padT + plotH + padB
  const n = Math.max(points.length, 1)

  const xAt = (i: number) =>
    padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yAt = (count: number) => padT + plotH - (count / max) * plotH

  const line = points
    .map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.count).toFixed(1)}`)
    .join(' ')

  return (
    <div className="admin-trend">
      <p className="admin-trend__unit">(건)</p>
      <svg
        className="admin-trend__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="이번 달 날짜별 주문 건수"
      >
        {ticks.map((tick) => {
          const y = yAt(tick)
          return (
            <g key={tick}>
              <line
                className="admin-trend__grid"
                x1={padL}
                x2={padL + plotW}
                y1={y}
                y2={y}
              />
              <text
                className="admin-trend__y"
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
              >
                {tick}
              </text>
            </g>
          )
        })}

        <polyline className="admin-trend__line" points={line} fill="none" />

        {points.map((point, i) => (
          <g key={point.date}>
            <circle
              className="admin-trend__dot"
              cx={xAt(i)}
              cy={yAt(point.count)}
              r="2"
            />
            <text
              className="admin-trend__tick"
              x={xAt(i)}
              y={padT + plotH + 14}
              textAnchor="end"
              transform={`rotate(-50 ${xAt(i)} ${padT + plotH + 14})`}
            >
              {formatTick(point.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
