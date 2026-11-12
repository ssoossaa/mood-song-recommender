import { motion } from "motion/react"
import type { Probabilities } from "@/lib/api"
import { EMOTIONS, EMOTION_META, mix, pct } from "@/lib/emotions"
import { cn } from "@/lib/utils"

type Props = {
  probabilities: Probabilities | null
  sorted?: boolean
  compact?: boolean
}

export function EmotionBars({ probabilities, sorted = false, compact = false }: Props) {
  const top = probabilities
    ? EMOTIONS.reduce((a, b) => (probabilities[a] >= probabilities[b] ? a : b))
    : null
  const order = sorted && probabilities
    ? [...EMOTIONS].sort((a, b) => probabilities[b] - probabilities[a])
    : EMOTIONS

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2.5")}>
      {order.map((emotion) => {
        const meta = EMOTION_META[emotion]
        const value = probabilities?.[emotion] ?? 0
        const isTop = emotion === top
        return (
          <motion.div layout key={emotion} className="flex items-center gap-3" transition={{ type: "spring", stiffness: 400, damping: 36 }}>
            <div className={cn("flex w-28 shrink-0 items-center gap-2", compact ? "text-xs" : "text-sm")}>
              <span className={cn(compact ? "text-sm" : "text-base", !isTop && "opacity-80 grayscale-[60%]")}>{meta.emoji}</span>
              <span className={cn(isTop ? "font-semibold text-foreground" : "text-muted-foreground")}>{meta.label}</span>
            </div>
            <div className={cn("relative flex-1 overflow-hidden rounded-full bg-track", compact ? "h-1.5" : "h-2.5")}>
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${mix(meta.color, 60)}, ${meta.color})`,
                  boxShadow: isTop ? `0 0 16px ${mix(meta.color, 55)}` : undefined,
                }}
                initial={false}
                animate={{ width: `${Math.max(value * 100, probabilities ? 1.5 : 0)}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 26 }}
              />
            </div>
            <span
              className={cn(
                "w-12 shrink-0 text-right font-mono tabular-nums",
                compact ? "text-xs" : "text-sm",
                isTop ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {probabilities ? pct(value) : "–"}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
