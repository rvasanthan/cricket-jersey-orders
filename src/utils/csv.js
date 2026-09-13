export function ordersToCsv(orders) {
  const headers = [
    'Order Number',
    'First Name',
    'Last Name',
    'Short Name',
    'Jersey Number',
    'Jersey Size',
    'Needs Hat',
    'Hat Size',
    'Needs Pants',
    'Pants Size',
    'Total Cost',
    'Status',
    'Created At',
  ]

  const rows = orders.map((order) => [
    order.orderNumber,
    order.firstName,
    order.lastName,
    order.shortName,
    order.jerseyNumber,
    order.jerseySize,
    order.needHat ? 'Yes' : 'No',
    order.needHat ? order.hatSize : '',
    order.needPants ? 'Yes' : 'No',
    order.needPants ? order.pantsSize : '',
    order.totalCost != null ? order.totalCost.toFixed(2) : '',
    order.status,
    order.createdAt ? new Date(order.createdAt).toLocaleString() : '',
  ])

  const escape = (value) => {
    const str = String(value ?? '')
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
