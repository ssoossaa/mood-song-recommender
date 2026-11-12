export type Emotion = "angry" | "disgust" | "fear" | "happy" | "neutral" | "sad" | "surprise"
export type Risk = "tension" | "excitement" | "low alertness" | "none"
export type Probabilities = Record<Emotion, number>
export type Point = { valence: number; energy: number }
export type Box = { x: number; y: number; w: number; h: number }

export type LibrarySong = {
  family: string
  track_id: string
  track_name: string
  artists: string
  genres: string
  popularity: number
  valence: number
  energy: number
  tempo: number
}

export type Song = {
  track_id: string
  track_name: string
  artists: string
  genres: string
  valence: number
  energy: number
  tempo: number
  popularity: number
  distance: number
}

export type Health = {
  ok: boolean
  detector: boolean
  tracks: number
  library: number
  test_accuracy: number
}

export type Config = {
  emotions: Emotion[]
  emotion_coords: Record<Emotion, Point>
  safe_points: Record<string, Point>
  tempo_ranges: Record<Risk, [number, number]>
  max_distance: number
}

export type LiveResult = {
  probabilities: Probabilities
  face_found: boolean
  face_box: Box
}

export type Analysis = {
  probabilities: Probabilities
  top_emotion: Emotion
  face_found: boolean
  face_box: Box | null
  face_image: string
  point: Point
  risk: Risk
  drive_point: Point
  tempo_range: [number, number]
  taste_genres: string[]
  match: Song
  drive: Song
}

export type Sample = { emotion: Emotion; index: number; url: string }

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // The API answers in French; the interface shows its own English messages.
    const messages: Record<number, string> = {
      400: "The image could not be read.",
      404: "Not found.",
      409: "No song left to recommend.",
    }
    throw new Error(messages[response.status] ?? `Server error (${response.status}).`)
  }
  return response.json() as Promise<T>
}

export const api = {
  health: () => fetch("/api/health").then((r) => json<Health>(r)),
  config: () => fetch("/api/config").then((r) => json<Config>(r)),
  library: () => fetch("/api/library").then((r) => json<LibrarySong[]>(r)),
  mapPoints: () => fetch("/api/map-points").then((r) => json<[number, number][]>(r)),
  samples: () => fetch("/api/samples").then((r) => json<Sample[]>(r)),

  live: (frame: Blob, signal?: AbortSignal) => {
    const body = new FormData()
    body.append("image", frame, "frame.jpg")
    return fetch("/api/live", { method: "POST", body, signal }).then((r) => json<LiveResult>(r))
  },

  analyze: (
    input: { image: Blob } | { sample: { emotion: Emotion; index: number } },
    liked: string[],
    exclude: string[],
  ) => {
    const body = new FormData()
    if ("image" in input) body.append("image", input.image, "photo.jpg")
    else {
      body.append("sample_emotion", input.sample.emotion)
      body.append("sample_index", String(input.sample.index))
    }
    body.append("liked", JSON.stringify(liked))
    body.append("exclude", JSON.stringify(exclude))
    return fetch("/api/analyze", { method: "POST", body }).then((r) => json<Analysis>(r))
  },
}
