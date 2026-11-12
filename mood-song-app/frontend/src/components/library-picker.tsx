import { motion } from "motion/react"
import { Check } from "lucide-react"
import type { LibrarySong } from "@/lib/api"
import { artists } from "@/lib/emotions"
import { cn } from "@/lib/utils"

const FAMILY_EMOJI: Record<string, string> = {
  Pop: "🎤",
  "Hip-hop": "🎧",
  "Dance / Electro": "🪩",
  Rock: "🎸",
  Metal: "🤘",
  Indie: "🌿",
  "R&B / Soul": "💜",
  Latin: "💃",
  French: "🥐",
  "Jazz / Blues": "🎷",
  "Country / Folk": "🤠",
  "Classical / Piano": "🎹",
}

type Props = {
  library: LibrarySong[]
  selected: Set<string>
  onToggle: (trackId: string) => void
}

export function LibraryPicker({ library, selected, onToggle }: Props) {
  const families = [...new Set(library.map((s) => s.family))]
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {families.map((family, fi) => {
        const songs = library.filter((s) => s.family === family)
        const count = songs.filter((s) => selected.has(s.track_id)).length
        return (
          <motion.section
            key={family}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: fi * 0.03 }}
            className="glass rounded-2xl border border-line p-4"
          >
            <header className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <span className="text-lg">{FAMILY_EMOJI[family] ?? "🎵"}</span> {family}
              </h3>
              {count > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{count}</span>
              )}
            </header>
            <ul className="flex flex-col gap-1">
              {songs.map((song) => {
                const on = selected.has(song.track_id)
                return (
                  <li key={song.track_id}>
                    <button
                      type="button"
                      onClick={() => onToggle(song.track_id)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                        on ? "bg-primary/12 ring-1 ring-primary/40" : "hover:bg-surface-hover",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border transition-all",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-line-strong group-hover:border-muted-foreground",
                        )}
                      >
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{song.track_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{artists(song.artists)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.section>
        )
      })}
    </div>
  )
}
