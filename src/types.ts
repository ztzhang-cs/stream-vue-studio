export type Tone = 'professional' | 'warm' | 'sharp'
export type ModelMode = 'deepseek-v4-flash' | 'deepseek-v4-pro'

export interface Session {
  id: string
  title: string
  prompt: string
  output: string
  tone: Tone
  model: ModelMode
  speed: number
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  prompt: string
}
