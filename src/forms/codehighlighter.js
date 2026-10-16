import { resolveInputSelector } from '../helpers/forms.js'
import { registerStyles } from '../helpers/utlity.js'

const HLJS_VERSION = '11.11.1'
const THEME_CDN = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}/styles`
const MODULE_CDN = 'https://esm.sh/highlight.js/lib'

// highlight.js core is shared across every instance on the page, and each
// language is registered against it once
let corePromise = null
const registeredLanguages = new Set()

async function loadHighlighter(language) {
  corePromise ??= import(`${MODULE_CDN}/core`).then((module) => module.default)

  const hljs = await corePromise

  if (!registeredLanguages.has(language)) {
    const module = await import(`${MODULE_CDN}/languages/${language}`)
    hljs.registerLanguage(language, module.default)
    registeredLanguages.add(language)
  }

  return hljs
}

// theme stylesheets are document level -- they style .hljs globally --
// so they are registered once per theme rather than per question
function registerTheme(theme) {
  const id = `HLJS-THEME-${theme}`
  if (document.getElementById(id)) return

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `${THEME_CDN}/${theme}.min.css`

  document.head.append(link)
}

// input selector begins with the input holding the source
// it is rendering as highlighted code
export default function codehighlighter(inputSelector, options = {}) {
  const { input, question, isEditing } = resolveInputSelector(inputSelector)
  const container = input.parentElement

  // only operates when the form is being viewed -- the inverse of datepicker
  if (isEditing)
    return {
      addStyles() {
        return this
      },
      make() {
        return { input, container, pre: null, code: null }
      },
    }

  const {
    language = 'javascript',
    theme = 'atom-one-light',
    collapsed = true,
    emptyText = '[not set]',
  } = options

  return {
    addStyles(content) {
      registerStyles(content, question ?? container)
      return this
    },
    make() {
      container.setAttribute('data-codehighlighter-container', '')

      const value = input.value.trim()

      // keep the input so the rendered value stays addressable, and drop
      // whatever Slate rendered alongside it
      container.replaceChildren(input)

      if (!value) {
        const empty = document.createElement('span')
        empty.setAttribute('data-codehighlighter-empty', '')
        empty.append(emptyText)

        container.append(empty)

        return { input, container, pre: null, code: null }
      }

      registerTheme(theme)

      const pre = document.createElement('pre')
      pre.setAttribute('data-codehighlighter', '')

      const code = document.createElement('code')
      code.classList.add('hljs', `language-${language}`)

      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.setAttribute('data-codehighlighter-toggle', '')
      toggle.append('...')

      const summary = document.createElement('span')
      summary.setAttribute('data-codehighlighter-summary', '')
      summary.append('{ ', toggle, ' }')

      let highlighted = false

      const collapse = () => {
        summary.style.display = ''
        code.style.display = 'none'
        pre.setAttribute('data-collapsed', '')
      }

      const expand = async () => {
        if (!highlighted) {
          highlighted = true

          try {
            const hljs = await loadHighlighter(language)
            code.innerHTML = hljs.highlight(value, { language }).value
          } catch (error) {
            // a CDN failure or an unknown language should still show the source
            console.error(
              `codehighlighter: could not highlight as "${language}"`,
              error,
            )
            code.textContent = value
          }
        }

        summary.style.display = 'none'
        code.style.display = ''
        pre.removeAttribute('data-collapsed')
      }

      toggle.addEventListener('click', expand)

      pre.append(summary, code)
      container.append(pre)

      if (collapsed) collapse()
      else expand()

      return { input, container, pre, code, expand, collapse }
    },
  }
}
