import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export function exportToExcel(
  filename: string,
  rows: Record<string, unknown>[],
  sheetName: string = 'Data'
) {
  if (!rows || !rows.length) return
  
  const worksheet = XLSX.utils.json_to_sheet(rows)
  
  const colWidths = Object.keys(rows[0]).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...rows.map((row) => String(row[key] || '').length)
    )
    return { wch: maxLength + 2 }
  })
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export function exportToPdf(
  filename: string,
  title: string,
  subtitle: string,
  rows: Record<string, unknown>[],
  orientation: 'portrait' | 'landscape' = 'landscape',
  autoPrint: boolean = false
) {
  if (!rows || !rows.length) return

  const doc = new jsPDF(orientation, 'mm', 'a4')
  
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('Maranatha Faith Assemblies Kenya', 14, 20)
  
  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139)
  doc.text(title, 14, 28)
  
  doc.setFontSize(9)
  doc.text(subtitle, 14, 34)
  
  doc.setFontSize(8)
  doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 40)

  const headers = Object.keys(rows[0])
  const body = rows.map(row => Object.values(row).map(val => String(val)))

  autoTable(doc, {
    startY: 45,
    head: [headers],
    body: body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 45 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 10
      )
    }
  })

  if (autoPrint) {
    doc.autoPrint()
  }

  doc.save(`${filename}.pdf`)
}