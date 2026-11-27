import { isEditing } from '../helpers/forms.js'

export function formControl(formSelector, { onSubmit = null } = {}) {
  const id = crypto.randomUUID()
  const form =
    formSelector instanceof HTMLFormElement
      ? formSelector
      : document.querySelector(formSelector)

  if (!form) throw new Error(`Form could not be found using: ${formSelector}`)
  if (!(form instanceof HTMLFormElement))
    throw new Error('controlForm only operates on form elements')

  form.dataset.controlId = id
  form.dataset.control = 'form'

  const editing = isEditing(form)

  const questions = new Map(
    [...form.querySelectorAll('.form_question')]
      .map((question) => [
        question,
        question.querySelector('label,.form_label'),
        question.querySelector('input, textarea, select'),
      ])
      .filter(([, label, input]) => label != null && input != null)
      .map(([question, label, input]) => {
        question.dataset.control = 'question'
        label.dataset.control = 'label'
        input.dataset.control = 'input'

        const style = (styles, applyTo = 'input') => {
          switch (applyTo) {
            case 'question':
              Object.assign(question.style, styles)
              break
            case 'label':
              Object.assign(label.style, styles)
              break
            case 'input':
              Object.assign(input.style, styles)
              break
            default:
              throw new Error(
                'Only question, label, and input are supported using applyTo:' +
                  applyTo,
              )
          }
        }

        const on = (event, handler, options = {}) => {
          input.addEventListener(event, handler, options)

          return () => input.removeEventListener(event, handler)
        }

        const validators = []
        const clearCallbacks = new Set()
        let errorCleanups = []
        const errorEl = document.createElement('span')
        errorEl.dataset.control = 'error'
        errorEl.style.display = 'none'
        question.append(errorEl)

        const showErrors = (messages) => {
          question.setAttribute('data-invalid', '')
          input.setAttribute('aria-invalid', 'true')
          errorEl.textContent = messages.join(', ')
          errorEl.style.display = ''
        }

        const clearErrors = () => {
          input.removeEventListener('input', clearErrors)
          input.removeEventListener('change', clearErrors)
          const hadErrors = question.hasAttribute('data-invalid')
          question.removeAttribute('data-invalid')
          input.removeAttribute('aria-invalid')
          errorEl.textContent = ''
          errorEl.style.display = ''
          const cleanups = errorCleanups
          errorCleanups = []
          cleanups.forEach((cleanup) => cleanup())
          if (hadErrors) {
            validators.forEach(([, cleanup]) => cleanup?.())
            Array.from(clearCallbacks).forEach((cleanup) => cleanup())
          }
        }

        const clearErrorsOn = (
          target,
          events = ['input', 'change'],
          { test = null, onClear = null } = {},
        ) => {
          const targets =
            target instanceof Element ? [target] : Array.from(target ?? [])
          const eventNames =
            typeof events === 'string' ? [events] : Array.from(events ?? [])

          if (
            !targets.length ||
            targets.some((element) => !(element instanceof Element))
          ) {
            throw new TypeError(
              'clearErrorsOn requires an element or a collection of elements',
            )
          }
          if (
            !eventNames.length ||
            eventNames.some(
              (event) => typeof event !== 'string' || !event.trim() || /\s/.test(event),
            )
          ) {
            throw new TypeError(
              'clearErrorsOn requires an event name or a collection of event names',
            )
          }
          if (test !== null && typeof test !== 'function') {
            throw new TypeError('clearErrorsOn test must be a function or null')
          }
          if (onClear !== null && typeof onClear !== 'function') {
            throw new TypeError('clearErrorsOn onClear must be a function or null')
          }

          // Give each registration its own listener so unsubscribing it does not
          // remove another registration or the original input's default listeners.
          const cleanup = () => onClear?.()
          const handler = (event) => {
            if (!question.hasAttribute('data-invalid')) return
            if (
              test !== null &&
              test({ event, target: event.currentTarget, input, question, label }) !==
                true
            ) {
              return
            }
            clearErrors()
          }
          clearCallbacks.add(cleanup)
          targets.forEach((element) => {
            eventNames.forEach((event) => element.addEventListener(event, handler))
          })

          return () => {
            clearCallbacks.delete(cleanup)
            targets.forEach((element) => {
              eventNames.forEach((event) => element.removeEventListener(event, handler))
            })
          }
        }

        return [
          label.textContent.trim(),
          {
            isEditing,
            question,
            label,
            input,
            style,
            on,
            effect: (fn) => {
              fn?.({ question, label, input, style })
              on('input', (event) => {
                fn?.({ question, label, input, style })
              })
            },
            addValidator: (fn, onClear = null) => {
              validators.push([fn, onClear])
            },
            validate: () => {
              clearErrors()

              const messages = validators
                .map(([v]) => v?.({ input }))
                .filter((message) => message !== true)
                .map((result) => {
                  if (!Array.isArray(result)) return result

                  const [message, cleanup] = result
                  if (typeof cleanup === 'function') errorCleanups.push(cleanup)
                  return message
                })

              const isValid = messages.length === 0

              if (!isValid) {
                on('input', clearErrors, { once: true })
                on('change', clearErrors, { once: true })
                showErrors(messages)

                return false
              }

              return true
            },
            clearErrors,
            clearErrorsOn,
          },
        ]
      }),
  )

  const submitButton = form.querySelector('button.default')

  if (submitButton) {
    submitButton.addEventListener(
      'click',
      (e) => {
        // run validation first
        if (![...questions].every(([, question]) => question.validate())) {
          e.preventDefault()
          e.stopImmediatePropagation()
        }

        // onSubmit
        if (onSubmit?.() === false) {
          e.preventDefault()
          e.stopImmediatePropagation()
        }
      },
      true,
    )
  }

  return {
    _form: form,
    _submitButton: submitButton,
    _questions: questions,
    _isEditing: editing,
    style(styles) {
      Object.assign(form.style, styles)

      return this
    },
    addStyles(content) {
      const style = document.createElement('style')
      style.textContent = `@scope { ${content.trim()} }`

      form.append(style)

      return this
    },
    questions(fn) {
      fn?.(
        (function (questions) {
          return {
            _questions: questions,
            style(styles, applyTo = 'input') {
              Array.from(questions.values()).forEach(({ style }) =>
                style(styles, applyTo),
              )
              return this
            },
          }
        })(questions),
      )

      return this
    },
    question(label, fn) {
      if (!questions.has(label)) return this
      fn?.({
        question: questions.get(label),
        questions,
        isEditing: editing,
      })

      return this
    },
  }
}
