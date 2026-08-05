export function isEditing(formEl) {
  if (!(formEl instanceof HTMLFormElement))
    throw new Error('isEditing only works with a form element')
  if (!formEl.action) throw new Error('form action is required')
  return new URL(formEl.action).searchParams.get('cmd') === 'form_edit'
}

export function resolveInputSelector(inputSelector) {
  const input =
    inputSelector instanceof HTMLInputElement
      ? inputSelector
      : document.querySelector(inputSelector)

  if (!input) throw new Error(`Invalid input selector: ${inputSelector}`)
  if (!(input instanceof HTMLInputElement))
    throw new Error(`datepicker only operates on an HTML input element`)

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
