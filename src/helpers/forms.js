export function isEditing(formEl) {
  if (!(formEl instanceof HTMLFormElement))
    throw new Error('isEditing only works with a form element')
  if (!form.action) throw new Error('form action is required')
  return new URL(form.action).searchParams.get('cmd') === 'form_edit'
}
