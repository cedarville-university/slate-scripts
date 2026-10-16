import { isEditing } from '../helpers/forms.js'

export function formControl(formSelector) {
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
        question.querySelector('label'),
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
          },
        ]
      }),
  )

  return {
    _form: form,
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
