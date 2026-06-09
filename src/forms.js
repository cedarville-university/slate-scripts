function datepicker(container) {
  if (container == null)
    throw new Error('A reference to the container element is required')

  const response = container.querySelector('.form_responses')
  if (response == null)
    throw new Error('The container must include the .form_responses container')

  response.dataset.datePicker = ''
  const form = container.closest('form')
  const isEditing = new URL(form.action).searchParams.get('cmd') === 'form_edit'

  if (!isEditing) {
    const responseText = response.textContent
    if (responseText) {
      response.style.color = ''
      response.textContent = new Date(responseText).toLocaleString()
    } else {
      response.style.color = '#aaa'
      response.textContent = '[not set]'
    }
  } else {
    const input = response.querySelector('input')
    input.type = 'hidden'

    const value = input.value
    const datetime = document.createElement('input')
    datetime.type = 'datetime-local'
    datetime.value = input.value || formatDate(new Date(input.value))

    datetime.addEventListener(
      'input',
      () => (input.value = datetime.value === '' ? '' : datetime.value + ':00'),
    )

    const quickActions = document.createElement('div')
    quickActions.dataset.datePickerQuickActions = ''
    quickActions.append(
      ...[
        [
          document.createElement('button'),
          'Today',
          () => (datetime.value = today()),
        ],
        [
          document.createElement('button'),
          'Now',
          () => (datetime.value = now()),
        ],
        [
          document.createElement('button'),
          '+1 day',
          () => {
            const d =
              datetime.value === '' ? new Date() : new Date(datetime.value)
            datetime.value = formatDate(
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
            datetime.value = formatDate(
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
            datetime.value = formatDate(
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
            datetime.value = formatDate(
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
              datetime.value = formatDate(
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
}

function today() {
  const now = new Date()
  return formatDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0),
  )
}

function now() {
  return formatDate(new Date())
}

function formatDate(d, mask = 'yyyy-MM-ddThh:mm') {
  try {
    let dateString = mask.replaceAll('yyyy', d.getFullYear())
    dateString = dateString.replaceAll('yy', String(d.getFullYear()).slice(2))

    dateString = dateString.replaceAll(
      'MM',
      String(d.getMonth() + 1).padStart(2, '0'),
    )
    dateString = dateString.replaceAll('M', d.getMonth() + 1)

    dateString = dateString.replaceAll(
      'dd',
      String(d.getDate()).padStart(2, '0'),
    )
    dateString = dateString.replaceAll('d', d.getDate())

    dateString = dateString.replaceAll(
      'hh',
      String(d.getHours()).padStart(2, '0'),
    )
    dateString = dateString.replaceAll('h', d.getHours())

    dateString = dateString.replaceAll(
      'mm',
      String(d.getMinutes()).padStart(2, '0'),
    )
    dateString = dateString.replaceAll('m', d.getMinutes())

    return dateString
  } catch (error) {
    console.error(
      `Unable to format the given date: ${error.message}, ${d}, ${mask}`,
    )
  }
}

export { datepicker, now, today, formatDate }
