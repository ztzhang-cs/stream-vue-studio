import { computed, ref } from 'vue'
import type { ModelMode, Tone } from '../types'

interface StreamOptions {
  prompt: string
  tone: Tone
  model: ModelMode
  speed: number
  onChunk: (chunk: string) => void
  onReset: () => void
  onTitleReady: () => void
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function extractContentFromSse(buffer: string) {
  const events = buffer.split('\n\n')
  const rest = events.pop() ?? ''
  const chunks: string[] = []

  for (const event of events) {
    const dataLines = event
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())

    for (const data of dataLines) {
      if (!data || data === '[DONE]') continue

      try {
        const payload = JSON.parse(data)
        const content = payload.choices?.[0]?.delta?.content
        if (typeof content === 'string') {
          chunks.push(content)
        }
      } catch {
        // Ignore incomplete or non-JSON SSE frames.
      }
    }
  }

  return { chunks, rest }
}

export function useStreamGenerator() {
  const isStreaming = ref(false)
  const isPaused = ref(false)
  const errorMessage = ref('')
  const statusText = computed(() => {
    if (errorMessage.value) return '出错'
    if (isPaused.value) return '已暂停'
    if (isStreaming.value) return '生成中'
    return '就绪'
  })

  let abortController: AbortController | null = null

  async function appendWithPacing(chunk: string, options: StreamOptions) {
    const pieces = chunk.match(/.{1,2}|\n/gmu) ?? []

    for (const piece of pieces) {
      if (abortController?.signal.aborted) break

      while (isPaused.value && !abortController?.signal.aborted) {
        await sleep(80)
      }

      options.onChunk(piece)
      await sleep(Math.max(4, 58 - options.speed))
    }
  }

  async function start(options: StreamOptions) {
    stop()

    abortController = new AbortController()
    isStreaming.value = true
    isPaused.value = false
    errorMessage.value = ''
    options.onReset()
    options.onTitleReady()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: options.prompt,
          tone: options.tone,
          model: options.model,
        }),
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        let message = `请求失败：${response.status}`
        try {
          const payload = await response.json()
          message = payload.error ?? message
        } catch {
          message = await response.text()
        }

        throw new Error(message)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parsed = extractContentFromSse(buffer)
        buffer = parsed.rest

        for (const chunk of parsed.chunks) {
          await appendWithPacing(chunk, options)
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      errorMessage.value = error instanceof Error ? error.message : '生成失败，请稍后重试。'
    } finally {
      isStreaming.value = false
      isPaused.value = false
      abortController = null
    }
  }

  function togglePause() {
    if (!isStreaming.value) return
    isPaused.value = !isPaused.value
  }

  function stop() {
    abortController?.abort()
    isStreaming.value = false
    isPaused.value = false
  }

  return {
    errorMessage,
    isPaused,
    isStreaming,
    statusText,
    start,
    stop,
    togglePause,
  }
}
