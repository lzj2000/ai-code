/**
 * Canvas XML 解析器常量定义
 *
 * 集中管理所有标签字符串，便于统一修改
 */

/** Artifact 容器标签 */
export const ARTIFACT_TAG_OPEN = '<canvasArtifact'
export const ARTIFACT_TAG_CLOSE = '</canvasArtifact>'

/** 代码内容标签 */
export const CODE_TAG_OPEN = '<canvasCode'
export const CODE_TAG_CLOSE = '</canvasCode>'

/** 配置标签（可选，未来扩展） */
export const CONFIG_TAG_OPEN = '<canvasConfig>'
export const CONFIG_TAG_CLOSE = '</canvasConfig>'

/** 属性名称 */
export const ATTR_ID = 'id'
export const ATTR_TYPE = 'type'
export const ATTR_TITLE = 'title'
export const ATTR_LANGUAGE = 'language'

/** XML 转义字符映射 */
export const XML_ESCAPE_MAP: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': '\'',
  '&apos;': '\'',
}

/** 反向转义映射 */
export const REVERSE_ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  '\'': '&#39;',
}

/** 正则表达式 */
export const ATTR_REGEX = /(\w+)=["']([^"']*)["']/g

/**
 * 解析标签属性字符串
 * @param attrString - 属性字符串，如 'id="counter" type="react" title="计数器"'
 * @returns 属性键值对对象
 */
export function parseAttributes(attrString: string): Record<string, string> {
  const result: Record<string, string> = {}
  const regex = new RegExp(ATTR_REGEX)
  let match: RegExpExecArray | null = regex.exec(attrString)

  while (match !== null) {
    result[match[1]] = match[2]
    match = regex.exec(attrString)
  }

  return result
}

/**
 * XML 反转义
 * @param text - 可能包含 XML 转义字符的文本
 * @returns 反转义后的文本
 */
export function unescapeXML(text: string): string {
  return text.replace(
    /&(lt|gt|amp|quot|apos|#39);/g,
    match => XML_ESCAPE_MAP[match] || match,
  )
}

/**
 * XML 转义
 * @param text - 需要转义的文本
 * @returns 转义后的文本
 */
export function escapeXML(text: string): string {
  return text.replace(/[<>&"']/g, char => REVERSE_ESCAPE_MAP[char] || char)
}
