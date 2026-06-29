import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const port = Number(process.env.PORT ?? 8787)
const allowedModels = new Set(['deepseek-v4-flash', 'deepseek-v4-pro'])
const defaultModel = 'deepseek-v4-flash'

function loadEnv() {
  const envPath = join(rootDir, '.env')
  if (!existsSync(envPath)) return

  const envText = readFileSync(envPath, 'utf8')
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const [name, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[name]) {
      process.env[name] = value
    }
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 1024 * 1024) {
        request.destroy()
        reject(new Error('请求内容过大'))
      }
    })

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('请求 JSON 格式不正确'))
      }
    })

    request.on('error', reject)
  })
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

loadEnv()

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, { ok: true, defaultModel, models: [...allowedModels] })
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/chat') {
    sendJson(response, 404, { error: '接口不存在' })
    return
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    sendJson(response, 500, { error: '缺少 DEEPSEEK_API_KEY，请检查项目根目录的 .env 文件。' })
    return
  }

  try {
    const body = await readJsonBody(request)
    const prompt = String(body.prompt ?? '').trim()
    const tone = String(body.tone ?? 'warm')
    const requestedModel = String(body.model ?? defaultModel)
    const model = allowedModels.has(requestedModel) ? requestedModel : defaultModel

    if (!prompt) {
      sendJson(response, 400, { error: 'Prompt 不能为空。' })
      return
    }

    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的中文写作助手。请直接回答用户问题，结构清晰，语言自然，不要提及你正在使用哪个模型。',
          },
          {
            role: 'user',
            content: `写作语气：${tone}\n\n用户需求：${prompt}`,
          },
        ],
        stream: true,
        temperature: 1.3,
      }),
    })

    if (!deepSeekResponse.ok || !deepSeekResponse.body) {
      const errorText = await deepSeekResponse.text()
      sendJson(response, deepSeekResponse.status, {
        error: errorText || `DeepSeek 请求失败：${deepSeekResponse.status}`,
      })
      return
    }

    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    })

    const reader = deepSeekResponse.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      response.write(value)
    }

    response.end()
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : '服务端请求失败。' })
      return
    }

    response.end()
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`DeepSeek proxy server running at http://127.0.0.1:${port}`)
})
