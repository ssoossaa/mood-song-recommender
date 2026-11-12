import type { Emotion, Risk } from "./api"

export const EMOTIONS: Emotion[] = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

/** Colors are CSS variables so they adapt to the light and dark themes. */
export const EMOTION_META: Record<Emotion, { label: string; emoji: string; color: string }> = {
  happy: { label: "Happy", emoji: "😄", color: "var(--emo-happy)" },
  surprise: { label: "Surprise", emoji: "😮", color: "var(--emo-surprise)" },
  angry: { label: "Angry", emoji: "😠", color: "var(--emo-angry)" },
  fear: { label: "Fear", emoji: "😨", color: "var(--emo-fear)" },
  disgust: { label: "Disgust", emoji: "🤢", color: "var(--emo-disgust)" },
  sad: { label: "Sad", emoji: "😢", color: "var(--emo-sad)" },
  neutral: { label: "Neutral", emoji: "😐", color: "var(--emo-neutral)" },
}

export const RISK_META: Record<Risk, { label: string; color: string; rule: string; emotions: string }> = {
  tension: {
    label: "Tension",
    color: "var(--emo-angry)",
    emotions: "angry + fear + disgust",
    rule: "The target is pulled 70% of the way towards a calm, positive point (valence 0.60 · energy 0.35), tempo 60-100 BPM.",
  },
  excitement: {
    label: "Excitement",
    color: "var(--emo-happy)",
    emotions: "happy + surprise",
    rule: "The mood is kept but energy is capped at 0.60, tempo 60-120 BPM.",
  },
  "low alertness": {
    label: "Low alertness",
    color: "var(--emo-sad)",
    emotions: "sad",
    rule: "The target is pulled 70% of the way towards a livelier point (valence 0.60 · energy 0.60), tempo 85-110 BPM.",
  },
  none: {
    label: "No risk",
    color: "var(--drive)",
    emotions: "neutral",
    rule: "No mood correction, tempo limited to 60-120 BPM.",
  },
}

/** Same color with transparency, works with CSS variables. */
export const mix = (color: string, percent: number) => `color-mix(in oklab, ${color} ${percent}%, transparent)`

export const fmt = (value: number, digits = 2) => value.toFixed(digits)
export const pct = (value: number) => `${Math.round(value * 100)}%`
export const artists = (text: string) => text.split(";").join(", ")
export const genres = (text: string) => text.split(";")

/** Same rule as taste_from_songs(): genres cited at least half as often as the top genre. */
export function tasteFromSongs(songGenres: string[]): string[] {
  const counts = new Map<string, number>()
  for (const text of songGenres) for (const g of text.split(";")) counts.set(g, (counts.get(g) ?? 0) + 1)
  if (counts.size === 0) return []
  const top = Math.max(...counts.values())
  return [...counts.entries()].filter(([, c]) => c >= top / 2).map(([g]) => g).sort()
}
