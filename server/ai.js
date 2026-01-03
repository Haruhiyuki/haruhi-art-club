import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

// 必须配置环境变量 DASHSCOPE_API_KEY
const API_KEY = process.env.DASHSCOPE_API_KEY || ''
const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL
})

// 系统提示词
const SYSTEM_PROMPT = `
你是一个严格的内容安全审核员。你的任务是检测内容中是否包含：色情、暴力、血腥、非法政治、违法犯罪或极度令人反感的内容。
请以JSON格式返回结果，包含两个字段：
1. "safe": boolean (true表示安全，false表示违规)
2. "reason": string (如果违规，简短说明原因；如果安全，返回"Pass")
不要返回多余的解释，只返回JSON。
`

/**
 * 审核文本
 * @returns {Promise<{safe: boolean, reason: string}>}
 */
export async function checkText(text) {
  if (!API_KEY) return { safe: true, reason: 'AI_OFFLINE' } // 无key时，标记为 Offline，让业务层决定策略
  const cleanText = String(text || '').trim()
  if (!cleanText) return { safe: true, reason: 'EMPTY' }

  try {
    const completion = await client.chat.completions.create({
      model: "qwen-plus",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `请审核以下文本：\n"${cleanText}"` }
      ],
      response_format: { type: "json_object" } 
    })

    const resRaw = completion.choices[0].message.content
    try {
      const res = JSON.parse(resRaw)
      return { safe: !!res.safe, reason: res.reason || '' }
    } catch (e) {
      console.warn('AI JSON Parse Error:', resRaw)
      return { safe: true, reason: 'AI_PARSE_ERROR' } // 解析失败通常意味着没有严重违规，或者模型不听话
    }
  } catch (err) {
    console.error('AI Check Text Error:', err)
    return { safe: true, reason: 'AI_API_ERROR' } // 接口报错
  }
}

/**
 * 审核图片 (本地文件)
 * @returns {Promise<{safe: boolean, reason: string}>}
 */
export async function checkImage(filePath) {
  if (!API_KEY) return { safe: true, reason: 'AI_OFFLINE' }
  
  try {
    const imageBuffer = fs.readFileSync(filePath)
    const base64Image = imageBuffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64Image}` 

    const completion = await client.chat.completions.create({
      model: "qwen3-vl-flash", // 视觉模型
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: "这张图片是否包含违规内容（色情、暴力、血腥等）？" },
          ],
        },
      ],
    })

    const resRaw = completion.choices[0].message.content
    
    let jsonStr = resRaw
    const jsonMatch = resRaw.match(/\{[\s\S]*\}/)
    if (jsonMatch) jsonStr = jsonMatch[0]

    try {
      const res = JSON.parse(jsonStr)
      return { safe: !!res.safe, reason: res.reason || '' }
    } catch {
      const lower = resRaw.toLowerCase()
      if (lower.includes('true') || lower.includes('pass') || lower.includes('安全')) {
        return { safe: true, reason: 'Pass (Text Analysis)' }
      }
      return { safe: false, reason: 'AI Review (Unstructured): ' + resRaw.slice(0, 50) }
    }

  } catch (err) {
    console.error('AI Check Image Error:', err)
    return { safe: true, reason: 'AI_API_ERROR' }
  }
}