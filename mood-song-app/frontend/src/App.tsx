import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight, Brain, Database, Loader2, Moon, RefreshCw, Sparkles, Sun, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CameraPanel } from "@/components/camera-panel"
import { LibraryPicker } from "@/components/library-picker"
import { MoodMap } from "@/components/mood-map"
import { Pipeline } from "@/components/pipeline"
import { PlaylistPanel, type PlaylistItem } from "@/components/playlist-panel"
import { Results, type Photo } from "@/components/results"
import { SamplesDialog } from "@/components/samples-dialog"
import { api, type Analysis, type Config, type Health, type LibrarySong, type Point, type Probabilities, type Sample } from "@/lib/api"
import { EMOTIONS, EMOTION_META, artists, tasteFromSongs } from "@/lib/emotions"
import { useTheme } from "@/lib/theme-context"
import { cn } from "@/lib/utils"

type Step = "taste" | "scan"

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [health, setHealth] = useState<Health | null>(null)
  const [offline, setOffline] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [library, setLibrary] = useState<LibrarySong[]>([])
  const [points, setPoints] = useState<[number, number][]>([])
  const [samples, setSamples] = useState<Sample[]>([])

  const [step, setStep] = useState<Step>("taste")
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [recos, setRecos] = useState<PlaylistItem[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [busy, setBusy] = useState(false)
  const [runs, setRuns] = useState(0)
  const [liveProbs, setLiveProbs] = useState<Probabilities | null>(null)
  const [samplesOpen, setSamplesOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  // ---- bootstrap
  const load = useCallback(async () => {
    try {
      const [h, c, l, p, s] = await Promise.all([api.health(), api.config(), api.library(), api.mapPoints(), api.samples()])
      setHealth(h)
      setConfig(c)
      setLibrary(l)
      setPoints(p)
      setSamples(s)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  // ---- playlist = songs chosen by the visitor + drive-mode songs recommended so far
  const chosen = useMemo<PlaylistItem[]>(
    () =>
      library
        .filter((s) => liked.has(s.track_id))
        .map((s) => ({ ...s, source: "chosen" as const })),
    [library, liked],
  )
  const playlist = useMemo(() => {
    const chosenIds = new Set(chosen.map((c) => c.track_id))
    return [...chosen, ...recos.filter((r) => !chosenIds.has(r.track_id))]
  }, [chosen, recos])
  const tasteGenres = useMemo(() => tasteFromSongs(chosen.map((c) => library.find((s) => s.track_id === c.track_id)!.genres)), [chosen, library])

  const toggleLiked = useCallback((id: string) => {
    setLiked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ---- live point on the map
  const livePoint = useMemo<Point | null>(() => {
    if (!liveProbs || !config) return null
    let valence = 0
    let energy = 0
    for (const e of EMOTIONS) {
      valence += liveProbs[e] * config.emotion_coords[e].valence
      energy += liveProbs[e] * config.emotion_coords[e].energy
    }
    return { valence, energy }
  }, [liveProbs, config])

  // ---- analysis
  const photoUrlRef = useRef<string | null>(null)
  const run = useCallback(
    async (input: Parameters<typeof api.analyze>[0], nextPhoto: Photo) => {
      setBusy(true)
      try {
        const [result] = await Promise.all([
          api.analyze(input, [...liked], playlist.map((p) => p.track_id)),
          new Promise((r) => setTimeout(r, 900)),
        ])
        if (photoUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(photoUrlRef.current)
        photoUrlRef.current = nextPhoto.url
        setPhoto(nextPhoto)
        setAnalysis(result)
        setRuns((n) => n + 1)
        setRecos((prev) => [
          ...prev,
          {
            track_id: result.drive.track_id,
            track_name: result.drive.track_name,
            artists: result.drive.artists,
            valence: result.drive.valence,
            energy: result.drive.energy,
            tempo: result.drive.tempo,
            source: "recommended",
            risk: result.risk,
            emotion: result.top_emotion,
          },
        ])
        const meta = EMOTION_META[result.top_emotion]
        toast.success(`${meta.emoji} ${meta.label} detected`, {
          description: `"${result.drive.track_name}" by ${artists(result.drive.artists)} added to the playlist.`,
        })
        requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
      } catch (error) {
        if (nextPhoto.url.startsWith("blob:")) URL.revokeObjectURL(nextPhoto.url)
        toast.error("Analysis failed", { description: (error as Error).message || "The server is not responding." })
      } finally {
        setBusy(false)
      }
    },
    [liked, playlist],
  )

  const onCapture = useCallback((image: Blob, previewUrl: string) => run({ image }, { url: previewUrl, mirrored: true, isFace48: false }), [run])
  const onUpload = useCallback(
    (file: File) => run({ image: file }, { url: URL.createObjectURL(file), mirrored: false, isFace48: false }),
    [run],
  )
  const onSample = useCallback(
    (sample: Sample) => {
      setSamplesOpen(false)
      run({ sample: { emotion: sample.emotion, index: sample.index } }, { url: sample.url, mirrored: false, isFace48: true })
    },
    [run],
  )
  const onLive = useCallback((p: Probabilities | null) => setLiveProbs(p), [])

  return (
    <TooltipProvider>
      <div className="aurora" />
      <div className="grid-bg" />
      <Toaster position="top-right" richColors={false} theme={theme} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative grid size-12 place-items-center rounded-2xl border border-line bg-gradient-to-br from-emerald-400/20 to-violet-500/20 shadow-[0_0_40px_-10px_#4ade80]">
              <svg viewBox="0 0 32 32" className="size-7">
                <defs>
                  <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4ade80" />
                    <stop offset="1" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <path d="M4 18c2.5-7 5-7 7.5 0s5 7 7.5 0 5-7 7.5 0" fill="none" stroke="url(#logo)" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Mood<span className="bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text dark:from-emerald-300 dark:to-violet-300 text-transparent">Drive</span>
              </h1>
              <p className="text-sm text-muted-foreground">From a driver's facial expression to a safer playlist</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusPill ok={!!health && !offline} label={offline ? "API offline" : health ? "Model loaded" : "Connecting…"} />
            {health && (
              <>
                <Pill icon={<Brain className="size-3.5" />}>CNN · {Math.round(health.test_accuracy * 1000) / 10}% test accuracy</Pill>
                <Pill icon={<Database className="size-3.5" />}>{health.tracks.toLocaleString("en-US")} Spotify tracks</Pill>
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              className="glass size-8 rounded-full border-line"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>

        {/* stepper */}
        <nav className="flex items-center gap-2">
          <StepButton n={1} label="Your taste" active={step === "taste"} done={liked.size > 0} onClick={() => setStep("taste")} />
          <div className="h-px w-8 bg-line-strong" />
          <StepButton n={2} label="Scan & recommend" active={step === "scan"} done={runs > 0} onClick={() => setStep("scan")} />
        </nav>

        {offline && (
          <Card className="border-red-500/30 bg-red-500/5 py-4">
            <CardContent className="flex flex-wrap items-center gap-3 px-5 text-sm">
              <WifiOff className="size-5 text-red-400" />
              <span className="flex-1">
                The Python server is not responding. Run <code className="rounded bg-sunken px-1.5 py-0.5 font-mono">./start.sh</code> and try again.
              </span>
              <Button size="sm" variant="secondary" onClick={load}>
                <RefreshCw /> Try again
              </Button>
            </CardContent>
          </Card>
        )}

        <AnimatePresence mode="wait">
          {step === "taste" ? (
            <motion.main
              key="taste"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5 pb-28"
            >
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Pick the songs you like</h2>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  Three or more works best. We extract your favourite genres from them, so two people with the same expression won't get the same song.
                </p>
              </div>
              {library.length === 0 && !offline ? (
                <div className="grid place-items-center py-20">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              ) : (
                <LibraryPicker library={library} selected={liked} onToggle={toggleLiked} />
              )}

              {/* sticky action bar */}
              <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
                  <div className="flex-1 text-sm">
                    <span className="font-semibold">{liked.size}</span>{" "}
                    <span className="text-muted-foreground">song{liked.size === 1 ? "" : "s"} picked</span>
                    {tasteGenres.length > 0 && (
                      <span className="ml-3 inline-flex flex-wrap gap-1.5 align-middle">
                        <span className="text-muted-foreground">genres:</span>
                        {tasteGenres.map((g) => (
                          <span key={g} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {g}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  {liked.size > 0 && (
                    <Button variant="ghost" className="rounded-full" onClick={() => setLiked(new Set())}>
                      Clear all
                    </Button>
                  )}
                  <Button size="lg" className="rounded-full font-semibold" onClick={() => setStep("scan")}>
                    {liked.size === 0 ? "Continue without taste" : "Go to the camera"} <ArrowRight />
                  </Button>
                </div>
              </div>
            </motion.main>
          ) : (
            <motion.main
              key="scan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid items-start gap-6 lg:grid-cols-12"
            >
              <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:col-span-5">
                <CameraPanel busy={busy} onCapture={onCapture} onUpload={onUpload} onOpenSamples={() => setSamplesOpen(true)} onLive={onLive} />
                <Button variant="ghost" className="self-start rounded-full text-muted-foreground" onClick={() => setStep("taste")}>
                  <ArrowLeft /> Edit my taste
                </Button>
              </div>

              <div ref={resultsRef} className="flex scroll-mt-6 flex-col gap-5 lg:col-span-7">
                <Pipeline busy={busy} done={runs} />
                {analysis && photo ? (
                  <motion.div key={runs} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn(busy && "pointer-events-none opacity-50 transition-opacity")}>
                    <Results analysis={analysis} photo={photo} config={config} points={points} />
                  </motion.div>
                ) : (
                  <Card className="glass gap-0 border-line py-5">
                    <CardContent className="flex flex-col items-center gap-2 px-5">
                      <div className="w-full max-w-lg">
                        <MoodMap config={config} points={points} analysis={null} livePoint={livePoint} />
                      </div>
                      <div className="flex items-center gap-2 text-center text-sm text-muted-foreground">
                        <Sparkles className="size-4 text-primary" />
                        {livePoint
                          ? "The dot follows your expression live. Strike a pose and capture!"
                          : "Turn on the camera: your expression lands on the map of songs."}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <PlaylistPanel items={playlist} onReset={() => setRecos([])} />
              </div>
            </motion.main>
          )}
        </AnimatePresence>

        <footer className="mt-auto pt-6 text-center text-xs text-muted-foreground/70">
          FER-2013 · Spotify Tracks Dataset · Photos are processed in memory and never saved.
        </footer>
      </div>

      <SamplesDialog open={samplesOpen} onOpenChange={setSamplesOpen} samples={samples} onPick={onSample} />
    </TooltipProvider>
  )
}

function StepButton({ n, label, active, done, onClick }: { n: number; label: string; active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-all",
        active ? "border-primary/50 bg-primary/10 text-foreground shadow-[0_0_24px_-8px_var(--primary)]" : "border-line text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full text-xs font-semibold",
          active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-surface-hover",
        )}
      >
        {n}
      </span>
      {label}
    </button>
  )
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="glass inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-muted-foreground">
      {icon}
      {children}
    </span>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("glass inline-flex items-center gap-2 rounded-full border px-3 py-1.5", ok ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "border-line text-muted-foreground")}>
      <span className="relative flex size-2">
        {ok && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={cn("relative inline-flex size-2 rounded-full", ok ? "bg-emerald-400" : "bg-muted-foreground")} />
      </span>
      {label}
    </span>
  )
}
