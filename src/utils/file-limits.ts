/** Match the desktop reader limits; scanning itself never hides large documents. */
export function fileSizeLimit(name: string) {
  return (/\.pdf$/i.test(name) ? 250 : 50) * 1024 * 1024
}

export function fileSizeError(name: string, size: number) {
  const limit = fileSizeLimit(name)
  return size > limit
    ? `文件大小超过 ${limit / 1024 / 1024} MB，暂时无法载入`
    : ''
}
