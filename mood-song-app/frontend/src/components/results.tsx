import { motion } from "motion/react"
import { Car, Gauge, Heart, Map as MapIcon, ScanEye, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmotionBars } from "@/components/emotion-bars"
import { MoodMap } from "@/components/mood-map"
import { SongCard } from "@/components/song-card"
import type { Analysis, Config, Point } from "@/lib/api"
import { EMOTION_META, RISK_META, fmt, mix, pct } from "@/lib/emotions"

export type Photo = { url: string; mirrored: boolean; isFace48: boolean }

type Props = {
  analysis: Analysis
  photo: Photo
  config: Config | null
  points: [number, number][]
}

export function Results({ analysis, photo, config, points }: Props) {
  const top = EMOTION_META[analysis.top_emotion]
  const risk = RISK_META[analysis.risk]
  const box = analysis.face_box

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        {/* what the model sees */}
        <Card className="glass gap-4 border-line py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanEye className="size-4 text-primary" /> What the model sees
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-5">
            <div className="flex items-stretch gap-4">
              {!photo.isFace48 && (
                <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-black">
                  <div className={photo.mirrored ? "relative -scale-x-100" : "relative"}>
                    <img src={photo.url} alt="Analysed photo" className="block h-auto w-full" />
                    {box && (
                      <motion.div
                        className="absolute rounded-md border-2"
                        style={{
                          left: `${box.x * 100}%`,
                          top: `${box.y * 100}%`,
                          width: `${box.w * 100}%`,
                          height: `${box.h * 100}%`,
                          borderColor: analysis.face_found ? top.color : "rgba(255,255,255,0.6)",
                          borderStyle: analysis.face_found ? "solid" : "dashed",
                          boxShadow: `0 0 18px ${mix(top.color, 40)}`,
                        }}
                        initial={{ opacity: 0, scale: 1.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                  </div>
                </div>
              )}
              <div className="flex shrink-0 flex-col items-center justify-center gap-2">
                <motion.img
                  src={analysis.face_image}
                  alt="48×48 grayscale face"
                  className="pixelated size-28 rounded-xl border border-line-strong"
                  initial={{ filter: "blur(8px)", opacity: 0 }}
                  animate={{ filter: "blur(0px)", opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
                <span className="text-center text-[11px] leading-tight text-muted-foreground">
                  48×48 grayscale
                  {!analysis.face_found && !photo.isFace48 && (
                    <>
                      <br />
                      <span className="text-amber-600 dark:text-amber-300">no face found: photo centre used</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-line bg-sunken p-4">
              <motion.span
                className="text-5xl"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}
              >
                {top.emoji}
              </motion.span>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Dominant emotion</div>
                <div className="text-2xl font-semibold" style={{ color: top.color }}>
                  {top.label} <span className="font-mono text-lg text-muted-foreground">{pct(analysis.probabilities[analysis.top_emotion])}</span>
                </div>
              </div>
            </div>
            <EmotionBars probabilities={analysis.probabilities} sorted />
          </CardContent>
        </Card>

        {/* map */}
        <Card className="glass gap-3 border-line py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapIcon className="size-4 text-primary" /> Valence / energy map
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5">
            <MoodMap config={config} points={points} analysis={analysis} livePoint={null} />
            <div className="grid gap-2 text-sm">
              <Coord icon="●" label="Your face" point={analysis.point} color="var(--ink)" />
              <Coord icon="◎" label="Drive-mode target" point={analysis.drive_point} color="var(--drive)" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block size-2 rotate-45 rounded-[2px] bg-match" /> Match song</span>
              <span className="flex items-center gap-1.5"><span className="inline-block size-2 rotate-45 rounded-[2px] bg-drive" /> Drive song</span>
              <span className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full" style={{ background: "var(--map-dot)" }} /> catalogue</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Average of the 7 emotion positions, weighted by their probabilities. We look for songs within{" "}
              {fmt(config?.max_distance ?? 0.15)} of the target (dashed circle), preferring hits.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* driving risk */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center"
        style={{ borderColor: mix(risk.color, 35) }}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: mix(risk.color, 14), color: risk.color }}>
            <Gauge className="size-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Driving risk</div>
            <div className="text-lg font-semibold" style={{ color: risk.color }}>
              {risk.label}
            </div>
          </div>
        </div>
        <div className="flex-1 text-sm text-muted-foreground sm:border-l sm:border-line sm:pl-5">
          <span className="text-foreground">Most likely group: {risk.emotions}.</span> {risk.rule}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5 sm:max-w-56 sm:justify-end">
          <span className="rounded-full bg-surface px-2.5 py-1 font-mono text-xs">
            {analysis.tempo_range[0]}–{analysis.tempo_range[1]} BPM
          </span>
          {analysis.taste_genres.length > 0 ? (
            analysis.taste_genres.map((g) => (
              <span key={g} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {g}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted-foreground">no taste</span>
          )}
        </div>
      </motion.div>

      {/* songs */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SongCard
          song={analysis.match}
          title="Match mode"
          subtitle="Fits your mood"
          icon={Heart}
          accent="var(--match)"
          delay={0.45}
        />
        <SongCard
          song={analysis.drive}
          title="Drive mode"
          subtitle="Keeps you focused at the wheel"
          icon={Car}
          accent="var(--drive)"
          delay={0.6}
          footer={
            <div className="relative flex items-center gap-2 text-xs text-drive">
              <ShieldCheck className="size-4" /> Added to the playlist
            </div>
          }
        />
      </div>
    </div>
  )
}

function Coord({ icon, label, point, color }: { icon: string; label: string; point: Point; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2">
      <span style={{ color }}>{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono text-xs tabular-nums">
        V {fmt(point.valence)} · E {fmt(point.energy)}
      </span>
    </div>
  )
}
