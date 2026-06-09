import { format, now, today } from '../helpers/dates'
import { isEditing } from '../helpers/forms'

const container = document.getElementById(
  'form_question_304ff8b4-349e-4e00-b348-8719d8967ad0',
)
const response = container.querySelector('.form_responses')
response.dataset.datePicker = ''

const isEditing = isEditing(container.closest('form'))

if (!isEditing) {
  let responseText = response.textContent
  if (responseText) {
    response.style.color = ''
    if (responseText.length === 10) responseText += 'T00:00:00'
    response.textContent = new Date(responseText).toLocaleString()
  } else {
    response.style.color = '#aaa'
    response.textContent = '[not set]'
  }
} else {
  const input = response.querySelector('input')
  input.type = 'hidden'

  let value = input.value
  if (value.length === 10) value += 'T00:00:00'

  const datetime = document.createElement('input')
  datetime.type = 'datetime-local'
  datetime.value = value || format(new Date(value))

  datetime.addEventListener(
    'input',
    () => (input.value = datetime.value === '' ? '' : datetime.value + ':00'),
  )

  datetime.addEventListener('change', () => {
    console.log(datetime.value)
  })

  const quickActions = document.createElement('div')
  quickActions.dataset.datePickerQuickActions = ''
  quickActions.append(
    ...[
      [
        document.createElement('button'),
        'Today',
        () => (datetime.value = today()),
      ],
      [document.createElement('button'), 'Now', () => (datetime.value = now())],
      [
        document.createElement('button'),
        '+1 day',
        () => {
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
      ],
      [
        document.createElement('button'),
        '-1 day',
        () => {
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
      ],
      [
        document.createElement('button'),
        '+1 hour',
        () => {
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
      ],
      [
        document.createElement('button'),
        '-1 hour',
        () => {
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
      ],
      [
        document.createElement('button'),
        'Midnight',
        () => {
          try {
            const d = new Date(datetime.value)
            datetime.value = format(
              new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0),
            )
          } catch (error) {
            datetime.value = today()
          }
        },
        (btn) => {
          if (datetime.value === '' || datetime.value.endsWith('00:00')) {
            btn.style.display = 'none'
          } else {
            btn.style.display = ''
          }
        },
      ],
      [
        document.createElement('button'),
        'Clear',
        () => (datetime.value = ''),
        (btn) => (btn.style.display = datetime.value === '' ? 'none' : ''),
      ],
    ].map(([btn, text, handleClick, effect]) => {
      btn.type = 'button'
      btn.append(text)
      btn.addEventListener('click', () => {
        const oldValue = datetime.value
        handleClick()
        const newValue = datetime.value

        // trigger changed event if necessary
        if (newValue !== oldValue) {
          datetime.dispatchEvent(new Event('input'))
        }
      })
      if (effect) {
        effect(btn)
        datetime.addEventListener('input', () => {
          effect(btn)
        })
      }
      return btn
    }),
  )

  response.append(datetime, quickActions)
}

// register datetime picker styles if they are not already registered
if (!document.getElementById('DATEPICKER-STYLES')) {
  const styles = document.createElement('style')
  styles.id = 'DATEPICKER-STYLES'
  styles.textContent = `
        [data-date-picker] {

          input[type='datetime-local'] {
            border: 1px solid var(--fw-input-border)
          }

          [data-date-picker-quick-actions] {
            margin-block: 0.5rem 0.25rem;
            gap: 0.5rem 0;
            display: flex;
            flex-wrap: wrap;
    
            span {
              display: block;
              margin-inline-end: 0.5rem;
              font-weight: 600;
            }
    
            button {
              border-radius: 0.25rem;
    
              &:disabled {
                opacity: 0.5;
              }
            }
          }
        }
      }
      `
  document.head.append(styles)
}

export function make() {}
