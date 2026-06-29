<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Clipboard,
  FilePlus2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
} from '@lucide/vue'
import { useStreamGenerator } from './composables/useStreamGenerator'
import { useSessionStore } from './stores/sessionStore'
import type { ModelMode, Tone } from './types'

const store = useSessionStore()
const streamer = useStreamGenerator()
const copied = ref(false)

onMounted(() => {
  store.initialize()
})

const activeSession = computed(() => store.activeSession)
const outputWordCount = computed(() => activeSession.value.output.trim().length)
const modelLabel = computed(() => {
  const selected = modelOptions.find((model) => model.value === activeSession.value.model)
  return selected?.shortLabel ?? 'Flash'
})
const updatedTime = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(activeSession.value.updatedAt)),
)

const toneOptions: { label: string; value: Tone }[] = [
  { label: '自然', value: 'warm' },
  { label: '专业', value: 'professional' },
  { label: '直接', value: 'sharp' },
]

const modelOptions: { label: string; shortLabel: string; value: ModelMode }[] = [
  { label: 'Flash', shortLabel: 'Flash', value: 'deepseek-v4-flash' },
  { label: 'Pro', shortLabel: 'Pro', value: 'deepseek-v4-pro' },
]

function generate() {
  streamer.start({
    prompt: activeSession.value.prompt,
    tone: activeSession.value.tone,
    model: activeSession.value.model,
    speed: activeSession.value.speed,
    onChunk: store.appendOutput,
    onReset: store.clearOutput,
    onTitleReady: store.renameFromPrompt,
  })
}

async function copyOutput() {
  if (!activeSession.value.output) return

  await navigator.clipboard.writeText(activeSession.value.output)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1400)
}
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar" aria-label="会话和模板">
      <div class="brand-row">
        <div>
          <p class="eyebrow">Stream Vue Studio</p>
          <h1>流式写作工作台</h1>
        </div>
        <button class="icon-button" type="button" title="新建会话" @click="store.addSession">
          <FilePlus2 :size="18" />
        </button>
      </div>

      <section class="panel-section">
        <div class="section-title">会话</div>
        <button
          v-for="session in store.sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === activeSession.id }"
          type="button"
          @click="store.selectSession(session.id)"
        >
          <span>{{ session.title }}</span>
          <small>{{ new Date(session.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</small>
        </button>
      </section>

      <section class="panel-section">
        <div class="section-title">模板</div>
        <button
          v-for="template in store.templates"
          :key="template.id"
          class="template-button"
          type="button"
          @click="store.applyTemplate(template)"
        >
          {{ template.name }}
        </button>
      </section>
    </aside>

    <section class="workspace" aria-label="生成工作区">
      <header class="workspace-header">
        <div>
          <p class="eyebrow">Vue 3 + Readable Stream Pattern</p>
          <h2>{{ activeSession.title }}</h2>
          <p class="model-caption">当前模型：{{ activeSession.model }}</p>
        </div>
        <div class="status-pill" :class="{ streaming: streamer.isStreaming.value }">
          <span></span>
          {{ streamer.statusText.value }}
        </div>
      </header>

      <p v-if="streamer.errorMessage.value" class="error-banner">
        {{ streamer.errorMessage.value }}
      </p>

      <section class="prompt-area">
        <div class="field-header">
          <label for="prompt">Prompt</label>
          <button class="ghost-button" type="button" @click="store.clearOutput">
            <Trash2 :size="16" />
            清空输出
          </button>
        </div>
        <textarea
          id="prompt"
          :value="activeSession.prompt"
          rows="7"
          @input="store.updatePrompt(($event.target as HTMLTextAreaElement).value)"
        />

        <div class="control-row">
          <div class="control-stack">
            <span>模型</span>
            <div class="segmented-control model-control" aria-label="模型">
              <button
                v-for="model in modelOptions"
                :key="model.value"
                type="button"
                :class="{ active: activeSession.model === model.value }"
                @click="store.updateModel(model.value)"
              >
                {{ model.label }}
              </button>
            </div>
          </div>

          <div class="control-stack">
            <span>语气</span>
            <div class="segmented-control tone-control" aria-label="语气">
              <button
                v-for="tone in toneOptions"
                :key="tone.value"
                type="button"
                :class="{ active: activeSession.tone === tone.value }"
                @click="store.updateTone(tone.value)"
              >
                {{ tone.label }}
              </button>
            </div>
          </div>

          <div class="control-stack speed-control">
            <span>速度</span>
            <input
              type="range"
              min="12"
              max="68"
              :value="activeSession.speed"
              @input="store.updateSpeed(Number(($event.target as HTMLInputElement).value))"
            />
          </div>
        </div>

        <div class="action-row">
          <button class="primary-button" type="button" :disabled="streamer.isStreaming.value" @click="generate">
            <Sparkles :size="18" />
            开始生成
          </button>
          <button class="secondary-button" type="button" :disabled="!streamer.isStreaming.value" @click="streamer.togglePause">
            <component :is="streamer.isPaused.value ? Play : Pause" :size="18" />
            {{ streamer.isPaused.value ? '继续' : '暂停' }}
          </button>
          <button class="secondary-button" type="button" :disabled="!streamer.isStreaming.value" @click="streamer.stop">
            <Square :size="16" />
            停止
          </button>
          <button class="secondary-button" type="button" :disabled="!activeSession.output" @click="generate">
            <RotateCcw :size="17" />
            重新生成
          </button>
        </div>
      </section>

      <section class="output-area" aria-label="流式输出结果">
        <div class="field-header">
          <label>输出</label>
          <button class="ghost-button" type="button" :disabled="!activeSession.output" @click="copyOutput">
            <Clipboard :size="16" />
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
        <pre class="output-box" :class="{ empty: !activeSession.output }">{{ activeSession.output || '等待生成内容...' }}</pre>
      </section>
    </section>

    <aside class="inspector" aria-label="状态和记录">
      <section class="metric-grid">
        <div class="metric-card">
          <span>字符</span>
          <strong>{{ outputWordCount }}</strong>
        </div>
        <div class="metric-card">
          <span>会话</span>
          <strong>{{ store.sessions.length }}</strong>
        </div>
        <div class="metric-card">
          <span>模型</span>
          <strong>{{ modelLabel }}</strong>
        </div>
        <div class="metric-card">
          <span>更新</span>
          <strong>{{ updatedTime }}</strong>
        </div>
      </section>

      <section class="detail-panel">
        <div class="section-title">生成状态</div>
        <div class="timeline">
          <div class="timeline-item done">输入已准备</div>
          <div class="timeline-item" :class="{ done: streamer.isStreaming.value || activeSession.output }">流式输出</div>
          <div class="timeline-item" :class="{ done: activeSession.output && !streamer.isStreaming.value }">结果可复制</div>
        </div>
      </section>

      <section class="detail-panel">
        <div class="section-title">最近结果</div>
        <button
          v-for="session in store.sessions.slice(0, 5)"
          :key="`recent-${session.id}`"
          class="recent-item"
          type="button"
          @click="store.selectSession(session.id)"
        >
          <span>{{ session.title }}</span>
          <small>{{ session.output ? `${session.output.length} 字符` : '暂无输出' }}</small>
        </button>
      </section>
    </aside>
  </main>
</template>
