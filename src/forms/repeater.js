import { resolveInputSelector } from '../helpers/forms.js'
import { createEl, registerStyles } from '../helpers/utlity.js'

export default function repeater(inputSelector) {
  const { input } = resolveInputSelector(inputSelector)

  return init(input, input.parentElement)
}

function init(input, container) {
  const items = JSON.parse(input.value.trim() || '[]')
  const columnKeys = Object.keys(items[0] ?? {}).filter((key) => key !== 'edit')
  const wrapper = createEl('div')
  wrapper.setAttribute('data-repeater-root', '')
  const table = createEl('table')

  const thead = createEl('thead')
  const headerRow = createEl('tr')
  const headers = []
  for (const header of columnKeys) {
    const headerEl = createEl('th', header)
    headerRow.append(headerEl)
    headers.push(headerEl)
  }
  const actionHeader = createEl('th')
  actionHeader.setAttribute('data-repeater-action-col', '')
  headerRow.append(actionHeader)
  headers.push(actionHeader)

  thead.append(headerRow)

  table.append(thead)

  const tbody = createEl('tbody')
  const rows = []

  const tfoot = createEl('tfoot')
  const actionRow = createEl('tr')
  const action = createEl('td')
  action.setAttribute('colspan', columnKeys.length + 1)
  action.setAttribute('data-repeater-action', '')

  actionRow.append(action)
  tfoot.append(actionRow)

  table.append(tbody, tfoot)
  wrapper.append(table)

  for (const item of items) {
    addRow(item)
  }

  function addRow(item) {
    // An initially empty repeater gets its columns from the first added item.
    if (columnKeys.length === 0 && rows.length === 0) {
      columnKeys.push(...Object.keys(item).filter((key) => key !== 'edit'))
      for (const key of columnKeys) {
        const header = createEl('th', key)
        headerRow.insertBefore(header, actionHeader)
        headers.splice(headers.length - 1, 0, header)
      }
      action.setAttribute('colspan', columnKeys.length + 1)
    }

    const row = createEl('tr')
    const cells = []
    for (const key of columnKeys) {
      const cell = createEl('td', item[key])
      cells.push(cell)
      row.append(cell)
    }

    const actionCell = createEl('td')

    if (item['edit']) {
      const editButton = createEl('button')
      editButton.ariaLabel = 'edit row'
      editButton.innerHTML = `
        ${item.edit.label ?? 'edit'}
      `
      if (item.edit.classlist) editButton.classList(...item.edit.classlist)
      editButton.type = 'button'
      editButton.addEventListener('click', item.edit.action)
      actionCell.append(editButton)
    }

    cells.push(actionCell)
    row.append(actionCell)

    tbody.append(row)
    rows.push({
      row,
      cells,
    })
  }

  function addItem(item) {
    items.push(item)
    addRow(item)

    input.value = JSON.stringify(
      items.map((item) => {
        delete item.edit
        return item
      }),
    )
    return this
  }

  function removeRow(index) {
    if (!Number.isInteger(index) || index < 0 || index >= rows.length)
      return this
    const [removed] = rows.splice(index, 1)
    removed.row.remove()
    return this
  }

  function removeItem(index) {
    if (!Number.isInteger(index) || index < 0 || index >= items.length)
      return this
    items.splice(index, 1)
    input.value = JSON.stringify(
      items.map((item) => {
        delete item.edit
        return item
      }),
    )

    removeRow(index)
    return this
  }

  function removeLastItem() {
    removeItem(items.length - 1)
    return this
  }

  container.append(wrapper)

  return {
    items,
    container,
    wrapper,
    table,
    thead,
    headerRow,
    headers,
    tbody,
    rows,
    tfoot,
    actionRow,
    action,
    addItem,
    addRow,
    removeItem,
    removeLastItem,
    removeRow,
    addStyles(content) {
      registerStyles(content, container)
      return this
    },
  }
}
