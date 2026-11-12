import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { Brain, Car, ChevronRight, Grid3x3, Map as MapIcon, Music, ScanFace } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { icon: ScanFace, label: "Face", detail: "OpenCV" },
  { icon: Grid3x3, label: "48×48 gray", detail: "like FER-2013" },
  { icon: Brain, label: "CNN", detail: "7 emotions" },
  { icon: MapIcon, label: "Valence / energy", detail: "weighted mean" },
  { icon: Car, label: "Driving rules", detail: "risk + tempo" },
  { icon: Music, label: "Song", detail: "20,023 tracks" },
]

/** The processing chain, lit step by step while an analysis runs. */
export function Pipeline({ busy, done }: { busy: boolean; done: number }) {
  const [active, setActive] = useState(-1)

  useEffect(() => {
    if (busy) {
      setActive(0)
      const id = window.setInterval(() => setActive((a) => Math.min(a + 1, STEPS.length - 2)), 160)
      return () => window.clearInterval(id)
    }
    if (done > 0) setActive(STEPS.length - 1)
  }, [busy, done])

  return (
    <div className="glass grid grid-cols-3 gap-1 rounded-2xl border border-line p-1.5 sm:grid-cols-6">
      {STEPS.map((step, i) => {
        const lit = i <= active
        const current = busy && i === active
        return (
          <motion.div
            key={step.label}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors duration-300",
              lit ? "bg-primary/10 text-foreground" : "text-muted-foreground",
            )}
            animate={current ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <step.icon className={cn("size-4 transition-colors", lit && "text-primary")} />
            <div className="text-[11px] font-medium leading-tight">{step.label}</div>
            <div className="hidden text-[10px] leading-tight text-muted-foreground md:block">{step.detail}</div>
            {i < STEPS.length - 1 && (
              <ChevronRight className={cn("absolute -right-2 top-1/2 z-10 hidden size-3 -translate-y-1/2 sm:block", i < active ? "text-primary" : "text-line-strong")} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
