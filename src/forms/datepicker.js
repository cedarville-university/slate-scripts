import { format, now, today } from '../helpers/dates.js'
import { isEditing, resolveInputSelector } from '../helpers/forms.js'
import { registerStyles } from '../helpers/utlity.js'

// input selector begins with the input it
// is converting to a datetime input
export default function datepicker(inputSelector) {
  const { input, question, isEditing } = resolveInputSelector(inputSelector)

  // only operates when the form is being edited
  if (!isEditing) return

  const inputValue = normalizeInputValue(input.value)

  const datetime = document.createElement('input')
  datetime.dataset.control = 'input'
  datetime.type = 'datetime-local'
  datetime.setAttribute('data-datepicker', '')
  datetime.value = inputValue || format(new Date(inputValue))
  datetime.style.cssText = input.style.cssText

  datetime.addEventListener('input', () => {
    const oldValue = input.value
    const newValue = normalizeInputValue(datetime.value)
    input.value = newValue
  })

  const style = document.createElement('style')
  let styleContent = ''

  const actions = new Set()

  function normalizeInputValue(inputValue) {
    if (inputValue.length === 10) inputValue += 'T00:00:00'
    if (inputValue.length === 16) inputValue += ':00'

    return inputValue
  }

  return {
    addStyles(content) {
      registerStyles(content, question)
      return this
    },
    addQuickAction({ label, action, effect }) {
      const button = document.createElement('button')
      button.type = 'button'
      button.append(label)
      button.addEventListener('click', () => {
        const oldValue = datetime.value
        action({ input, datetime, button, today, now, formatDt: format })
        const newValue = datetime.value

        // trigger changed event if necessary
        if (newValue !== oldValue) {
          datetime.dispatchEvent(new Event('input'))
          input.dispatchEvent(new Event('input'))
        }
      })
      if (effect) {
        effect({ input, datetime, button })
        datetime.addEventListener('input', () => {
          effect({ input, datetime, button })
        })
      }

      actions.add(button)

      return this
    },
    addQuickActions(actions) {
      actions.forEach((action) => this.addQuickAction(action))
      return this
    },
    addDefaultQuickActions() {
      const actions = [
        {
          label: 'Today',
          action: ({ datetime }) => (datetime.value = today()),
        },
        {
          label: 'Now',
          action: ({ datetime }) => (datetime.value = now()),
        },
        {
          label: '+1 day',
          action: ({ datetime }) => {
            const d =
              datetime.value === '' ? new Date() : new Date(datetime.value)
            datetime.value = format(
              new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate() + 1,
                d.getHours(),
                d.getMinutes(),
              ),
            )
          },
        },
        {
          label: '-1 day',
          action: ({ datetime }) => {
            const d =
              datetime.value === '' ? new Date() : new Date(datetime.value)
            datetime.value = format(
              new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate() - 1,
                d.getHours(),
                d.getMinutes(),
              ),
            )
          },
        },
        {
          label: '+1 hour',
          action: ({ datetime }) => {
            const d =
              datetime.value === '' ? new Date() : new Date(datetime.value)
            datetime.value = format(
              new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate(),
                d.getHours() + 1,
                d.getMinutes(),
              ),
            )
          },
        },
        {
          label: '-1 hour',
          action: ({ datetime }) => {
            const d =
              datetime.value === '' ? new Date() : new Date(datetime.value)
            datetime.value = format(
              new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate(),
                d.getHours() - 1,
                d.getMinutes(),
              ),
            )
          },
        },
        {
          label: 'Midnight',
          action: ({ datetime }) => {
            try {
              const d = new Date(datetime.value)
              datetime.value = format(
                new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0),
              )
            } catch (error) {
              datetime.value = today()
            }
          },
          effect: ({ datetime, button }) => {
            button.disabled =
              datetime.value === '' || datetime.value.endsWith('00:00')
          },
        },
        {
          label: 'Clear',
          action: ({ datetime }) => (datetime.value = ''),
          effect: ({ datetime, button }) =>
            (button.disabled = datetime.value === ''),
        },
      ]

      this.addQuickActions(actions)

      return this
    },
    make() {
      input.type = 'hidden'

      const parentElement = input.parentElement
      parentElement.setAttribute('data-datepicker-container', '')

      parentElement.append(datetime, ...actions)

      if (actions.size > 0) {
        const actionsContainer = document.createElement('div')
        actionsContainer.setAttribute('data-datepicker-quick-actions', '')
        actionsContainer.append(...actions)
        parentElement.append(actionsContainer)
      }

      return {
        input,
        datetime,
        container: parentElement,
      }
    },
  }
}
