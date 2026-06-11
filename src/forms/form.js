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

  const questions = new Map(
    [...form.querySelectorAll('.form_question')].map((question) => {
      question.dataset.control = 'question'

      const label = question.querySelector('label')
      label.dataset.control = 'label'

      const input = question.querySelector('input, textarea, select')
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
    style(styles) {
      Object.assign(form.style, styles)

      return this
    },
    css(content) {
      const style =
        document.getElementById(`${id}_css`) ?? document.createElement('style')
      style.id = `${id}_css`
      style.textContent = `form[data-control-id="${id}"] { ${content.trim()} }`

      if (style.parentElement == null) {
        form.parentElement.append(style)
      }

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
      if (!questions.has(label)) return
      fn?.(questions.get(label), questions)

      return this
    },
  }
}
