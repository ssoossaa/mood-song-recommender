import { motion } from "motion/react"
import { ExternalLink, type LucideIcon } from "lucide-react"
import type { Song } from "@/lib/api"
import { artists, fmt, genres, mix } from "@/lib/emotions"
import { useTheme } from "@/lib/theme-context"

type Props = {
  song: Song
  title: string
  subtitle: string
  icon: LucideIcon
  accent: string
  delay?: number
  footer?: React.ReactNode
}

export function SongCard({ song, title, subtitle, icon: Icon, accent, delay = 0, footer }: Props) {
  const { theme } = useTheme()
  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 24 }}
      className="glass relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-line p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl" style={{ background: mix(accent, 15) }} />

      <header className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
            <Icon className="size-4" /> {title}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <a
          href={`https://open.spotify.com/track/${song.track_id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Open in Spotify"
        >
          <ExternalLink className="size-4" />
        </a>
      </header>

      <div className="relative">
        <h3 className="text-xl font-semibold leading-tight tracking-tight">{song.track_name}</h3>
        <p className="mt-0.5 text-muted-foreground">{artists(song.artists)}</p>
      </div>

      <div className="relative grid grid-cols-4 gap-2 text-center">
        <Stat label="Valence" value={fmt(song.valence)} />
        <Stat label="Energy" value={fmt(song.energy)} />
        <Stat label="Tempo" value={`${Math.round(song.tempo)}`} unit="BPM" />
        <Stat label="Distance" value={fmt(song.distance, 3)} />
      </div>

      <div className="relative flex flex-wrap gap-1.5">
        {genres(song.genres).map((g) => (
          <span key={g} className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted-foreground">
            {g}
          </span>
        ))}
        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted-foreground">
          popularity {song.popularity}
        </span>
      </div>

      <iframe
        title={`Spotify · ${song.track_name}`}
        src={`https://open.spotify.com/embed/track/${song.track_id}?utm_source=generator${theme === "dark" ? "&theme=0" : ""}`}
        width="100%"
        height="152"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className="relative rounded-xl border-0 bg-sunken"
      />
      {footer}
    </motion.article>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-line bg-sunken px-2 py-2">
      <div className="font-mono text-base font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}
