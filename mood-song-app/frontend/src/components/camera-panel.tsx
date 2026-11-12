import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Camera, CameraOff, ImageUp, Loader2, ScanFace, Sparkles, Users, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmotionBars } from "@/components/emotion-bars"
import { api, type Box, type Probabilities } from "@/lib/api"
import { EMOTIONS, EMOTION_META, mix, pct } from "@/lib/emotions"
import { cn } from "@/lib/utils"

type Status = "idle" | "starting" | "live" | "denied" | "error"

type Props = {
  busy: boolean
  onCapture: (image: Blob, previewUrl: string) => void
  onUpload: (file: File) => void
  onOpenSamples: () => void
  onLive: (probabilities: Probabilities | null) => void
}

const LIVE_INTERVAL_MS = 280
const LIVE_WIDTH = 480
const SMOOTHING = 0.45

export function CameraPanel({ busy, onCapture, onUpload, onOpenSamples, onLive }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const smoothRef = useRef<Probabilities | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [aspect, setAspect] = useState(16 / 9)
  const [liveOn, setLiveOn] = useState(true)
  const [live, setLive] = useState<{ probabilities: Probabilities; box: Box; found: boolean } | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [flash, setFlash] = useState(0)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    smoothRef.current = null
    setLive(null)
    onLive(null)
    setStatus("idle")
  }, [onLive])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error")
      return
    }
    setStatus("starting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setAspect(video.videoWidth / video.videoHeight || 16 / 9)
      setStatus("live")
    } catch (error) {
      const name = (error as DOMException)?.name
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error")
    }
  }, [])

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  // ---- live analysis loop
  useEffect(() => {
    if (status !== "live" || !liveOn) {
      smoothRef.current = null
      setLive(null)
      onLive(null)
      return
    }
    let cancelled = false
    let inFlight = false
    const canvas = document.createElement("canvas")
    const controller = new AbortController()

    const tick = async () => {
      const video = videoRef.current
      if (cancelled || inFlight || !video || video.readyState < 2 || !video.videoWidth) return
      inFlight = true
      try {
        canvas.width = LIVE_WIDTH
        canvas.height = Math.round((LIVE_WIDTH * video.videoHeight) / video.videoWidth)
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.75))
        if (!blob || cancelled) return
        const result = await api.live(blob, controller.signal)
        if (cancelled) return
        const prev = smoothRef.current
        const next = {} as Probabilities
        for (const e of EMOTIONS) {
          next[e] = prev ? prev[e] * SMOOTHING + result.probabilities[e] * (1 - SMOOTHING) : result.probabilities[e]
        }
        smoothRef.current = next
        setLive({ probabilities: next, box: result.face_box, found: result.face_found })
        onLive(next)
      } catch {
        /* network hiccup: next tick will retry */
      } finally {
        inFlight = false
      }
    }
    const id = window.setInterval(tick, LIVE_INTERVAL_MS)
    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(id)
    }
  }, [status, liveOn, onLive])

  // ---- capture with countdown
  const capture = useCallback(async () => {
    const video = videoRef.current
    if (!video || status !== "live") return
    for (const n of [3, 2, 1]) {
      setCountdown(n)
      await new Promise((r) => setTimeout(r, 650))
    }
    setCountdown(null)
    setFlash((f) => f + 1)
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")!.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
    if (blob) onCapture(blob, canvas.toDataURL("image/jpeg", 0.85))
  }, [status, onCapture])

  // Space bar = capture (handy during the presentation)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.code !== "Space" || target.closest("input, textarea, button, [role=dialog]")) return
      event.preventDefault()
      if (!busy && countdown === null) capture()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, countdown, capture])

  const top = live ? EMOTIONS.reduce((a, b) => (live.probabilities[a] >= live.probabilities[b] ? a : b)) : null
  const topMeta = top ? EMOTION_META[top] : null

  return (
    <Card className="glass gap-4 overflow-hidden border-line py-5">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanFace className="size-4 text-primary" /> Camera
        </CardTitle>
        <div className="flex items-center gap-2">
          {status === "live" && (
            <Button
              size="sm"
              variant={liveOn ? "secondary" : "ghost"}
              className="h-7 gap-1.5 rounded-full px-3 text-xs"
              onClick={() => setLiveOn((v) => !v)}
            >
              <Zap className={cn("size-3.5", liveOn && "fill-primary text-primary")} />
              Live analysis {liveOn ? "on" : "off"}
            </Button>
          )}
          <Badge variant="outline" className={cn("gap-1.5 rounded-full", status === "live" && "border-red-500/40 text-red-600 dark:text-red-300")}>
            <span className={cn("size-1.5 rounded-full", status === "live" ? "animate-pulse bg-red-500" : "bg-muted-foreground")} />
            {status === "live" ? "Live" : "Off"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5">
        {/* video stage */}
        <div
          className={cn("relative w-full overflow-hidden rounded-2xl border border-line", status === "live" ? "bg-black" : "bg-sunken")}
          style={{ aspectRatio: status === "live" ? aspect : 16 / 10 }}
        >
          <video ref={videoRef} playsInline muted className={cn("absolute inset-0 h-full w-full -scale-x-100 object-contain", status !== "live" && "opacity-0")} />

          {status === "live" && (
            <>
              <div className="scanline" />
              {/* face box, mirrored like the video */}
              <div className="pointer-events-none absolute inset-0 -scale-x-100">
                {live && (
                  <div
                    data-testid="face-box"
                    className="absolute transition-all duration-300 ease-out"
                    style={{
                      left: `${live.box.x * 100}%`,
                      top: `${live.box.y * 100}%`,
                      width: `${live.box.w * 100}%`,
                      height: `${live.box.h * 100}%`,
                    }}
                  >
                    <Corners color={live.found ? topMeta?.color ?? "var(--drive)" : "rgba(255,255,255,0.6)"} dashed={!live.found} />
                  </div>
                )}
              </div>
              {/* label (not mirrored) */}
              {live && topMeta && (
                <div
                  className="pointer-events-none absolute transition-all duration-300 ease-out"
                  style={{ left: `${(1 - live.box.x - live.box.w) * 100}%`, top: `${live.box.y * 100}%` }}
                >
                  <div
                    className="-translate-y-[calc(100%+8px)] whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg"
                    style={{ background: live.found ? topMeta.color : "rgba(255,255,255,0.9)", color: live.found ? "var(--on-emo)" : "#000" }}
                  >
                    {live.found ? `${topMeta.emoji} ${topMeta.label} · ${pct(live.probabilities[top!])}` : "No face found · using image centre"}
                  </div>
                </div>
              )}
            </>
          )}

          {/* countdown + flash */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                key={countdown}
                className="absolute inset-0 grid place-items-center"
                initial={{ opacity: 0, scale: 1.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.35 }}
              >
                <span className="text-8xl font-bold text-white drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]">{countdown}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {flash > 0 && (
              <motion.div
                key={flash}
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>

          {/* idle / error states */}
          {status !== "live" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="flex max-w-sm flex-col items-center gap-4">
                <div className="grid size-16 place-items-center rounded-2xl border border-line bg-surface">
                  {status === "starting" ? <Loader2 className="size-7 animate-spin text-primary" /> : status === "idle" ? <Camera className="size-7 text-primary" /> : <CameraOff className="size-7 text-red-400" />}
                </div>
                {status === "idle" && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Ask the person for permission before filming. The image stays in memory and is never saved.
                    </p>
                    <Button size="lg" className="rounded-full" onClick={start}>
                      <Camera /> Turn on camera
                    </Button>
                  </>
                )}
                {status === "starting" && <p className="text-sm text-muted-foreground">Allow camera access in the browser…</p>}
                {(status === "denied" || status === "error") && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {status === "denied"
                        ? "Camera access denied. Allow it in the browser settings (icon left of the address bar), or use a photo."
                        : "No camera found. Open the page on http://localhost, or use a photo / a backup face."}
                    </p>
                    <Button variant="secondary" className="rounded-full" onClick={start}>
                      Try again
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="lg"
            className="h-12 flex-1 rounded-full text-base font-semibold shadow-[0_0_30px_-6px_var(--primary)]"
            disabled={status !== "live" || busy || countdown !== null}
            onClick={capture}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? "Analysing…" : "Capture & recommend"}
            <kbd className="ml-1 hidden rounded border border-current/30 px-1.5 font-mono text-[10px] opacity-60 sm:inline">space</kbd>
          </Button>
          {status === "live" && (
            <Button size="icon" variant="ghost" className="size-12 rounded-full" onClick={stop} title="Turn off camera">
              <CameraOff />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            <ImageUp /> Upload a photo
          </Button>
          <Button variant="outline" className="rounded-full" disabled={busy} onClick={onOpenSamples}>
            <Users /> Backup faces
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onUpload(file)
              event.target.value = ""
            }}
          />
        </div>

        {/* live bars */}
        <AnimatePresence initial={false}>
          {status === "live" && liveOn && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-line bg-sunken p-4">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                  <span>Live reading</span>
                  <span className="font-mono normal-case tracking-normal">CNN · 48×48 · ~{Math.round(1000 / LIVE_INTERVAL_MS)} fps</span>
                </div>
                <EmotionBars probabilities={live?.probabilities ?? null} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

function Corners({ color, dashed }: { color: string; dashed: boolean }) {
  const common = "absolute size-5 border-[3px]"
  const style = { borderColor: color, borderStyle: dashed ? "dashed" : "solid", filter: `drop-shadow(0 0 6px ${mix(color, 80)})` }
  return (
    <>
      <span className={cn(common, "left-0 top-0 rounded-tl-lg border-b-0 border-r-0")} style={style} />
      <span className={cn(common, "right-0 top-0 rounded-tr-lg border-b-0 border-l-0")} style={style} />
      <span className={cn(common, "bottom-0 left-0 rounded-bl-lg border-r-0 border-t-0")} style={style} />
      <span className={cn(common, "bottom-0 right-0 rounded-br-lg border-l-0 border-t-0")} style={style} />
    </>
  )
}
