import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Emotion, Sample } from "@/lib/api"
import { EMOTIONS, EMOTION_META } from "@/lib/emotions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  samples: Sample[]
  onPick: (sample: Sample) => void
}

export function SamplesDialog({ open, onOpenChange, samples, onPick }: Props) {
  const byEmotion = (e: Emotion) => samples.filter((s) => s.emotion === e)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Backup faces (FER-2013)</DialogTitle>
          <DialogDescription>
            If the camera is blocked or the room is too dark, pick a face from the test set. The emotion shown is the true
            label; the model can get it wrong (59.5% accuracy).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {EMOTIONS.map((emotion) => {
            const meta = EMOTION_META[emotion]
            return (
              <div key={emotion} className="flex items-center gap-4">
                <div className="flex w-32 shrink-0 items-center gap-2 text-sm">
                  <span className="text-lg">{meta.emoji}</span>
                  <span style={{ color: meta.color }} className="font-medium">
                    {meta.label}
                  </span>
                </div>
                <div className="flex gap-2">
                  {byEmotion(emotion).map((sample) => (
                    <button
                      key={sample.url}
                      type="button"
                      onClick={() => onPick(sample)}
                      className="overflow-hidden rounded-lg border border-line transition hover:scale-105 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <img src={sample.url} alt={`${meta.label} ${sample.index + 1}`} className="pixelated size-16 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
