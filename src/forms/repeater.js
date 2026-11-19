import { resolveInputSelector } from '../helpers/forms.js'
import { createEl, registerStyles } from '../helpers/utlity.js'

export default function repeater(inputSelector, options = {}) {
  const { input } = resolveInputSelector(inputSelector)

  return init(input, { container: input.parentElement, ...options })
}

function init(
  input,
  {
    container,
    maxNewItems = null,
    emptyText = null,
    keys = null,
    formatter = null,
    renderActions = null,
    visibility = {},
    storage = {},
  },
) {
  const {
    parse = (value) => JSON.parse(value.trim() || '[]'),
    serialize = (items) => JSON.stringify(items),
  } = storage
  if (typeof parse !== 'function' || typeof serialize !== 'function') {
    throw new TypeError('storage.parse and storage.serialize must be functions')
  }
  const items = parse(input.value)
  if (!Array.isArray(items) || items.some((item) =>
    item == null || typeof item !== 'object' || Array.isArray(item)
  )) {
    throw new TypeError('storage.parse must return an array of item objects')
  }
  const newItemFlags = items.map(() => false)
  let newItemsCount = 0
  const visibilityPreferences = { table: true, empty: true, action: true, ...visibility }
  const isDataKey = (key) => !['editAction', 'deleteAction', 'format'].includes(key)
  const columns = (keys ?? Object.keys(items[0] ?? {}))
    .map((column) => (typeof column === 'string' ? { key: column } : column))
    .filter(({ key }) => isDataKey(key))
  const wrapper = createEl('div')
  wrapper.setAttribute('data-repeater-root', '')
  wrapper.style.minWidth = '0'
  const tableWrapper = createEl('div')
  tableWrapper.setAttribute('data-repeater-table-wrapper', '')
  tableWrapper.style.overflowX = 'auto'
  const emptyRow = createEl('tr')
  const empty = createEl('td', emptyText)
  emptyRow.append(empty)
  empty.setAttribute('colspan', columns.length + 1)
  empty.setAttribute('data-repeater-empty', '')
  const table = createEl('table')

  const thead = createEl('thead')
  const headerRow = createEl('tr')
  const headers = []
  for (const { key: header } of columns) {
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
  tbody.append(emptyRow)
  const rows = []

  const action = createEl('div')
  action.setAttribute('data-repeater-action', '')

  table.append(tbody)
  tableWrapper.append(table)
  wrapper.append(tableWrapper, action)
  updateVisibility()

  for (const item of items) {
    addRow(item)
  }

  function hideElements(...els) {
    els.forEach((el) => (el.style.display = 'none'))
  }

  function showElements(...els) {
    els.forEach((el) => (el.style.display = ''))
  }

  function changeVisibility(mode, targets) {
    const parts = new Map([
      ['table', 'table'], [table, 'table'], [tableWrapper, 'table'],
      ['empty', 'empty'], [empty, 'empty'], [emptyRow, 'empty'],
      ['action', 'action'], [action, 'action'],
    ])

    for (const target of targets) {
      const part = parts.get(target)
      if (part) {
        visibilityPreferences[part] = mode === 'toggle'
          ? !visibilityPreferences[part]
          : mode === 'show'
      } else {
        if (!target?.style) throw new TypeError('Expected a repeater part name or an element')
        const visible = mode === 'toggle' ? target.style.display === 'none' : mode === 'show'
        if (visible) showElements(target)
        else hideElements(target)
      }
    }

    updateVisibility()
    return api
  }

  function show(...targets) {
    return changeVisibility('show', targets)
  }

  function hide(...targets) {
    return changeVisibility('hide', targets)
  }

  function toggle(...targets) {
    return changeVisibility('toggle', targets)
  }

  function updateVisibility() {
    const showTable = visibilityPreferences.table && rows.length > 0
    const showEmpty = visibilityPreferences.empty && rows.length === 0 && emptyText != null
    const showAction = visibilityPreferences.action &&
      (maxNewItems == null || newItemsCount < maxNewItems)

    if (showTable) showElements(thead)
    else hideElements(thead)
    if (showEmpty) showElements(emptyRow)
    else hideElements(emptyRow)
    if (showTable || showEmpty) showElements(tableWrapper, table)
    else hideElements(tableWrapper, table)
    if (showAction) showElements(action)
    else hideElements(action)
    if (showTable || showEmpty || showAction) showElements(wrapper)
    else hideElements(wrapper)
  }

  function addRow(item) {
    // An initially empty repeater gets its columns from the first added item.
    if (keys == null && columns.length === 0 && rows.length === 0) {
      columns.push(...Object.keys(item).filter(isDataKey).map((key) => ({ key })))
      for (const { key } of columns) {
        const header = createEl('th', key)
        headerRow.insertBefore(header, actionHeader)
        headers.splice(headers.length - 1, 0, header)
      }
      empty.setAttribute('colspan', columns.length + 1)
    }

    const row = createEl('tr')
    const cells = []
    for (const { key, formatter: columnFormatter } of columns) {
      const value = columnFormatter
        ? columnFormatter(item[key], item)
        : formatter
          ? formatter(key, item[key])
          : item[key]
      const cell = createEl('td', value)
      cells.push(cell)
      row.append(cell)
    }

    const actionCell = createEl('td')

    for (const [key, label] of [
      ['editAction', 'edit'],
      ['deleteAction', 'delete'],
    ]) {
      const config = item[key]
      if (!config) continue

      const button = createEl('button')
      button.ariaLabel = `${label} row`
      button.innerHTML = config.label ?? label
      if (config.classList) button.classList.add(...config.classList)
      button.type = 'button'
      button.addEventListener(
        'click',
        config.action ??
          (key === 'deleteAction'
            ? () => removeItem(rows.findIndex((entry) => entry.row === row))
            : null),
      )
      actionCell.append(button)
    }

    cells.push(actionCell)
    row.append(actionCell)

    tbody.insertBefore(row, emptyRow)
    rows.push({
      row,
      cells,
    })
    updateVisibility()
  }

  function saveItems() {
    const value = serialize(
      items.map(({ editAction, deleteAction, ...data }) => data),
    )
    if (typeof value !== 'string') {
      throw new TypeError('storage.serialize must return a string')
    }
    input.value = value
  }

  function addItem(item) {
    if (maxNewItems != null && newItemsCount >= maxNewItems) {
      throw new RangeError(
        `Cannot add more than ${maxNewItems} new items per form visit.`,
      )
    }

    items.push(item)
    addRow(item)
    newItemFlags.push(true)
    newItemsCount++
    updateVisibility()

    saveItems()

    return this
  }

  function removeRow(index) {
    if (!Number.isInteger(index) || index < 0 || index >= rows.length)
      return this
    const [removed] = rows.splice(index, 1)
    removed.row.remove()
    updateVisibility()
    return this
  }

  function removeItem(index) {
    if (!Number.isInteger(index) || index < 0 || index >= items.length)
      return this
    items.splice(index, 1)
    const [wasNew] = newItemFlags.splice(index, 1)
    if (wasNew) newItemsCount--
    updateVisibility()
    saveItems()

    removeRow(index)
    return this
  }

  function removeLastItem() {
    removeItem(items.length - 1)
    return this
  }

  container.append(wrapper)

  const api = {
    items,
    container,
    wrapper,
    tableWrapper,
    empty,
    emptyRow,
    table,
    thead,
    headerRow,
    headers,
    tbody,
    rows,
    action,
    show,
    hide,
    toggle,
    addItem,
    addRow,
    removeItem,
    removeLastItem,
    removeRow,
    setVisibility(changes) {
      Object.assign(visibilityPreferences, changes)
      updateVisibility()
      return api
    },
    addStyles(content) {
      registerStyles(content, container)
      return this
    },
  }

  renderActions?.({ ...api, container: action })

  return api
}
