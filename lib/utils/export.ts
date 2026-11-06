/**
 * Generic CSV Export Utility.
 * Takes a filename and an array of objects, converts them to CSV format,
 * and triggers a browser download.
 */
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) {
    return
  }

  // 1. Extract Headers from the first object
  const headers = Object.keys(rows[0])

  // 2. Build the CSV string
  const csvContent = [
    // Headers row
    headers.join(','),
    // Data rows
    ...rows.map(row => 
      headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : row[header]
        
        // Convert to string and escape quotes/commas
        cell = String(cell)
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          cell = `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(',')
    )
  ].join('\n')

  // 3. Trigger Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}