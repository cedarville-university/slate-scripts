export function isEditing(formEl) {
  if (!(formEl instanceof HTMLFormElement))
    throw new Error('isEditing only works with a form element')
  if (!formEl.action) throw new Error('form action is required')
  const actionURL = new URL(formEl.action)
  return ['form_edit', 'widget'].includes(actionURL.searchParams.get('cmd'))
}

export function resolveInputSelector(inputSelector) {
  const input =
    inputSelector instanceof HTMLInputElement ||
    inputSelector instanceof HTMLTextAreaElement
      ? inputSelector
      : document.querySelector(inputSelector)

  if (!input) throw new Error(`Invalid input selector: ${inputSelector}`)
  if (
    !(input instanceof HTMLInputElement) &&
    !(input instanceof HTMLTextAreaElement)
  )
    throw new Error(`Must be an HTML input or textarea element`)

  const form = input.closest('form')

  if (!form)
    throw new Error(`Form element not found for selector: ${inputSelector}`)

  return {
    input,
    form,
    isEditing: isEditing(form),
    question: input.closest('[data-control="question"]'),
  }
}
