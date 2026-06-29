import { defineStore } from 'pinia'
import type { ModelMode, Session, Template, Tone } from '../types'

const now = () => new Date().toISOString()

const defaultPrompt = '帮我为一个 Vue 流式输出项目写一段产品介绍，语气自然，突出实时生成、可中断、历史记录和工作台体验。'

const templates: Template[] = [
  {
    id: 'product',
    name: '产品介绍',
    prompt: '为我的前端项目写一段清晰的产品介绍，突出目标用户、核心能力和使用场景。',
  },
  {
    id: 'summary',
    name: '文档摘要',
    prompt: '请把下面的内容整理成摘要、关键观点和下一步行动项。',
  },
  {
    id: 'debug',
    name: '问题排查',
    prompt: '请根据现象、环境和复现步骤，帮我分析可能原因并给出排查顺序。',
  },
]

function createSession(title = 'Vue 流式工作台'): Session {
  const timestamp = now()

  return {
    id: crypto.randomUUID(),
    title,
    prompt: defaultPrompt,
    output: '',
    tone: 'warm',
    model: 'deepseek-v4-flash',
    speed: 36,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export const useSessionStore = defineStore('sessions', {
  state: () => ({
    sessions: [createSession()] as Session[],
    activeId: '' as string,
    templates,
  }),
  getters: {
    activeSession(state): Session {
      const id = state.activeId || state.sessions[0]?.id
      return state.sessions.find((session) => session.id === id) ?? state.sessions[0]
    },
  },
  actions: {
    initialize() {
      if (!this.activeId && this.sessions.length > 0) {
        this.activeId = this.sessions[0].id
      }
    },
    addSession() {
      const session = createSession(`新会话 ${this.sessions.length + 1}`)
      this.sessions.unshift(session)
      this.activeId = session.id
    },
    selectSession(id: string) {
      this.activeId = id
    },
    applyTemplate(template: Template) {
      this.activeSession.prompt = template.prompt
      this.touch()
    },
    updatePrompt(prompt: string) {
      this.activeSession.prompt = prompt
      this.touch()
    },
    updateTone(tone: Tone) {
      this.activeSession.tone = tone
      this.touch()
    },
    updateModel(model: ModelMode) {
      this.activeSession.model = model
      this.touch()
    },
    updateSpeed(speed: number) {
      this.activeSession.speed = speed
      this.touch()
    },
    replaceOutput(output: string) {
      this.activeSession.output = output
      this.touch()
    },
    appendOutput(chunk: string) {
      this.activeSession.output += chunk
      this.touch()
    },
    clearOutput() {
      this.activeSession.output = ''
      this.touch()
    },
    renameFromPrompt() {
      const firstLine = this.activeSession.prompt.trim().split(/\n/)[0]
      this.activeSession.title = firstLine.slice(0, 22) || '未命名会话'
      this.touch()
    },
    touch() {
      this.activeSession.updatedAt = now()
    },
  },
})
