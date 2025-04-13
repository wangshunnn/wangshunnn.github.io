/**
 * 按照字符宽度分割文本，避免单词被割裂
 * @param text 要分割的文本
 * @param maxWidth 每行最大宽度（以半角字符为单位，一个汉字=2个半角字符）
 * @param maxLines 最大行数
 * @returns 分割后的文本数组
 */
export function splitTextByWidth(
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const result: string[] = []
  let currentLine = ''
  let currentWidth = 0
  let currentWord = ''
  let currentWordWidth = 0

  // 处理每个字符
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const charWidth = /[\u4e00-\u9fa5\uFF00-\uFFFF]/.test(char) ? 2 : 1
    const isEnglishChar = /[a-zA-Z0-9]/.test(char)

    // 如果是英文字符，先加入当前单词缓存
    if (isEnglishChar) {
      currentWord += char
      currentWordWidth += charWidth
      continue
    }

    // 处理之前缓存的英文单词（如果有）
    if (currentWord) {
      // 如果当前行加上这个单词会超出最大宽度，则换行
      if (currentWidth + currentWordWidth > maxWidth) {
        result.push(currentLine)
        if (result.length >= maxLines) {
          result[maxLines - 1] += '...'
          break
        }
        currentLine = currentWord
        currentWidth = currentWordWidth
      } else {
        currentLine += currentWord
        currentWidth += currentWordWidth
      }
      currentWord = ''
      currentWordWidth = 0
    }

    // 处理非英文字符（中文、标点等）
    if (currentWidth + charWidth > maxWidth) {
      result.push(currentLine)
      if (result.length >= maxLines) {
        result[maxLines - 1] += '...'
        break
      }
      currentLine = char
      currentWidth = charWidth
    } else {
      currentLine += char
      currentWidth += charWidth
    }
  }

  // 处理最后可能剩余的英文单词
  if (currentWord) {
    if (currentWidth + currentWordWidth > maxWidth) {
      result.push(currentLine)
      if (result.length < maxLines) {
        result.push(currentWord)
      } else {
        result[maxLines - 1] = result[maxLines - 1].slice(0, -2) + '...'
      }
    } else {
      currentLine += currentWord
      if (result.length < maxLines) {
        result.push(currentLine)
      }
    }
  } else if (currentLine && result.length < maxLines) {
    result.push(currentLine)
  }

  // 填充空行至指定行数
  while (result.length < maxLines) {
    result.push('')
  }

  return result
}
