import { AnimatePresence, motion } from "motion/react"
import type { Analysis, Config, Point } from "@/lib/api"
import { EMOTIONS, EMOTION_META, mix } from "@/lib/emotions"

const S = 420
const PAD = 34
const INNER = S - PAD * 2
const X = (v: number) => PAD + v * INNER
const Y = (e: number) => S - PAD - e * INNER

// SVG presentation attributes do not accept CSS variables, so theme colors go through `style`.
const INK = "var(--ink)"
const OUTLINE = "var(--marker-outline)"
const DRIVE = "var(--drive)"
const MATCH = "var(--match)"

type Props = {
  config: Config | null
  points: [number, number][]
  analysis: Analysis | null
  livePoint: Point | null
}

export function MoodMap({ config, points, analysis, livePoint }: Props) {
  const r = (config?.max_distance ?? 0.15) * INNER
  const p = analysis?.point
  const d = analysis?.drive_point
  const moved = p && d && Math.hypot(p.valence - d.valence, p.energy - d.energy) > 0.01

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full select-none" role="img" aria-label="Valence / energy map">
      <defs>
        <radialGradient id="glow-ink">
          <stop offset="0%" style={{ stopColor: INK, stopOpacity: 0.7 }} />
          <stop offset="100%" style={{ stopColor: INK, stopOpacity: 0 }} />
        </radialGradient>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: DRIVE }} />
        </marker>
        <linearGradient id="quad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.07" />
          <stop offset="50%" stopColor="#888" stopOpacity="0" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.07" />
        </linearGradient>
      </defs>

      {/* frame + grid */}
      <rect x={PAD} y={PAD} width={INNER} height={INNER} rx={14} fill="url(#quad)" style={{ stroke: "var(--line-strong)" }} />
      {[0.25, 0.5, 0.75].map((t) => (
        <g key={t} style={{ stroke: "var(--line)" }} strokeDasharray={t === 0.5 ? undefined : "2 4"}>
          <line x1={X(t)} y1={PAD} x2={X(t)} y2={S - PAD} />
          <line x1={PAD} y1={Y(t)} x2={S - PAD} y2={Y(t)} />
        </g>
      ))}

      {/* quadrant labels */}
      <g className="fill-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]" opacity={0.75}>
        <text x={PAD + 10} y={PAD + 18}>Tense</text>
        <text x={S - PAD - 10} y={PAD + 18} textAnchor="end">Euphoric</text>
        <text x={PAD + 10} y={S - PAD - 10}>Melancholic</text>
        <text x={S - PAD - 10} y={S - PAD - 10} textAnchor="end">Serene</text>
      </g>

      {/* axes */}
      <g className="fill-muted-foreground text-[10.5px]">
        <text x={S / 2} y={S - 10} textAnchor="middle">Valence (negative → positive)</text>
        <text x={12} y={S / 2} textAnchor="middle" transform={`rotate(-90 12 ${S / 2})`}>Energy (calm → intense)</text>
      </g>

      {/* catalogue */}
      <g style={{ fill: "var(--map-dot)" }}>
        {points.map(([v, e], i) => (
          <circle key={i} cx={X(v)} cy={Y(e)} r={1.3} />
        ))}
      </g>

      {/* emotion anchors */}
      {config &&
        EMOTIONS.map((emotion) => {
          const c = config.emotion_coords[emotion]
          const meta = EMOTION_META[emotion]
          const active = analysis?.top_emotion === emotion
          return (
            <g key={emotion} opacity={analysis && !active ? 0.55 : 1}>
              <circle cx={X(c.valence)} cy={Y(c.energy)} r={active ? 7 : 5} strokeWidth={2} style={{ fill: meta.color, stroke: OUTLINE }} />
              <text x={X(c.valence) + 10} y={Y(c.energy) + 4} className="text-[11px] font-medium" style={{ fill: meta.color }}>
                {meta.emoji} {meta.label}
              </text>
            </g>
          )
        })}

      {/* live ghost point */}
      <AnimatePresence>
        {livePoint && !analysis && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.circle
              r={22}
              fill="url(#glow-ink)"
              initial={false}
              animate={{ cx: X(livePoint.valence), cy: Y(livePoint.energy) }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
            <motion.circle
              r={5}
              strokeWidth={2}
              style={{ fill: INK, stroke: OUTLINE }}
              initial={false}
              animate={{ cx: X(livePoint.valence), cy: Y(livePoint.energy) }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </motion.g>
        )}
      </AnimatePresence>

      {/* analysis */}
      <AnimatePresence mode="wait">
        {analysis && p && d && (
          <motion.g key={analysis.match.track_id + analysis.drive.track_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* search radius around each target */}
            <circle cx={X(p.valence)} cy={Y(p.energy)} r={r} strokeDasharray="3 4" style={{ fill: mix(INK, 5), stroke: mix(INK, 40) }} />
            {moved && (
              <circle cx={X(d.valence)} cy={Y(d.energy)} r={r} strokeDasharray="3 4" style={{ fill: mix(DRIVE, 8), stroke: mix(DRIVE, 60) }} />
            )}

            {/* steering arrow */}
            {moved && (
              <motion.line
                x1={X(p.valence)} y1={Y(p.energy)} x2={X(d.valence)} y2={Y(d.energy)}
                strokeWidth={2} strokeDasharray="5 4" markerEnd="url(#arrow)" style={{ stroke: DRIVE }}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.5 }}
              />
            )}

            {/* songs */}
            <SongDot point={analysis.match} color={MATCH} delay={0.9} />
            <SongDot point={analysis.drive} color={DRIVE} delay={1.1} />

            {/* face point */}
            <circle cx={X(p.valence)} cy={Y(p.energy)} r={20} fill="url(#glow-ink)">
              <animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <motion.circle
              cx={X(p.valence)} cy={Y(p.energy)} r={6.5} strokeWidth={2} style={{ fill: INK, stroke: OUTLINE }}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
            />
            {moved && (
              <motion.circle
                cx={X(d.valence)} cy={Y(d.energy)} r={6} strokeWidth={3} style={{ fill: "var(--background)", stroke: DRIVE }}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: 1.2 }}
              />
            )}
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  )
}

function SongDot({ point, color, delay }: { point: Point; color: string; delay: number }) {
  const x = X(point.valence)
  const y = Y(point.energy)
  return (
    <motion.g initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <rect x={x - 5} y={y - 5} width={10} height={10} rx={2} strokeWidth={1.5} transform={`rotate(45 ${x} ${y})`} style={{ fill: color, stroke: OUTLINE }} />
    </motion.g>
  )
}
