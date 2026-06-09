export function today() {
  const now = new Date()
  return format(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0),
  )
}

export function now() {
  return format(new Date())
}

export function format(d, mask = 'yyyy-MM-ddThh:mm') {
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
      `Unable to format the given date: ${error.message}, ${d}, ${format}`,
    )
  }
}
