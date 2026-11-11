export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || !rows.length) return
  const separator = ','
  const keys = Object.keys(rows[0])
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            const value = row[k]
            const cell = value === null || value === undefined ? '' : value
            let cellStr = cell instanceof Date ? cell.toLocaleString() : String(cell)
            if (cellStr.search(/("|,|\n)/g) >= 0) {
              cellStr = `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(separator)
      })
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}