/** 仅解析明确的学号列表，不从姓名、长学号或任意文字中猜测号码。 */
export function parseRoster(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*+]\s+/, ''))
    .join('\n')
    .split(/[\s,，、;；]+/)
    .filter(Boolean);
}
