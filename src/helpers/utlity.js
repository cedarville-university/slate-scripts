export function debounce(fn, ms = 250) {
  let timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...arguments), ms)
  }
}

export function registerStyles(textContent, appendTo) {
  if (textContent.trim() === '')
    throw new Error('Text content is required to register styles')
  if (!appendTo || !(appendTo instanceof HTMLElement))
    throw new Error('appendTo must be a valid HTMLElement')

  const style = document.createElement('style')
  style.textContent = `@scope { ${textContent.trim()} }`
  appendTo.append(style)
}
