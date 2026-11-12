import { AnimatePresence, motion } from "motion/react"
import { ListMusic, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Emotion, Risk } from "@/lib/api"
import { EMOTION_META, RISK_META, artists, fmt, mix } from "@/lib/emotions"

export type PlaylistItem = {
  track_id: string
  track_name: string
  artists: string
  valence: number
  energy: number
  tempo: number
  source: "chosen" | "recommended"
  risk?: Risk
  emotion?: Emotion
}

type Props = {
  items: PlaylistItem[]
  onReset: () => void
}

export function PlaylistPanel({ items, onReset }: Props) {
  const recommended = items.filter((i) => i.source === "recommended").length
  return (
    <Card className="glass gap-3 border-line py-5">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListMusic className="size-4 text-primary" /> Your playlist
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {items.length} {items.length === 1 ? "track" : "tracks"} · {recommended} recommended
          </span>
        </CardTitle>
        {recommended > 0 && (
          <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" onClick={onReset}>
            <RotateCcw className="size-3.5" /> Clear recommendations
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-3">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No song picked: recommendations will not use a personal taste.
          </p>
        ) : (
          <ol className="flex flex-col">
            <AnimatePresence initial={false}>
              {[...items].reverse().map((item, i) => {
                const n = items.length - i
                const risk = item.risk ? RISK_META[item.risk] : null
                const emo = item.emotion ? EMOTION_META[item.emotion] : null
                return (
                  <motion.li
                    key={item.track_id}
                    layout
                    initial={{ opacity: 0, x: -16, backgroundColor: "rgba(34,197,94,0.18)" }}
                    animate={{ opacity: 1, x: 0, backgroundColor: "rgba(34,197,94,0)" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center gap-3 rounded-lg px-2 py-2"
                  >
                    <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{n}</span>
                    <a
                      href={`https://open.spotify.com/track/${item.track_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <span className="block truncate text-sm font-medium">{item.track_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{artists(item.artists)}</span>
                    </a>
                    <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground md:inline">
                      V {fmt(item.valence)} · E {fmt(item.energy)} · {Math.round(item.tempo)} BPM
                    </span>
                    {item.source === "chosen" ? (
                      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">picked</span>
                    ) : (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: risk ? mix(risk.color, 14) : undefined, color: risk?.color }}
                      >
                        {emo?.emoji} reco · {risk?.label.toLowerCase()}
                      </span>
                    )}
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
