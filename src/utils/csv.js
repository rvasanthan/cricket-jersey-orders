export function ordersToCsv(orders) {
  const headers = [
    'Order Number',
    'First Name',
    'Last Name',
    'Short Name',
    'Jersey Number',
    'Jerseys Summary',
    'Total Jersey Qty',
    'Needs Hat',
    'Hat Details',
    'Needs Pants',
    'Pants Details',
    'Total Cost',
    'Status',
    'Created At',
  ]

  const rows = orders.map((order) => {
    const jerseys = order.jerseys || []
    const totalQty = jerseys.reduce((sum, j) => sum + (Number(j.quantity) || 1), 0)
    const jerseySummary = jerseys
      .map((j) => {
        const addon =
          j.jerseyColor === 'Red'
            ? j.needDragon
              ? ' (Dragon)'
              : ''
            : j.needBlueWhale
              ? ' (Blue Whale)'
              : ''
        return `${j.jerseyColor} ${j.jerseySize} ${j.sleeveType}${addon} x${j.quantity}`
      })
      .join('; ')

    const hatDetails = order.needHat
      ? `${order.hatColor || 'Red'} ${order.hatSize} x${order.hatQuantity || 1}`
      : ''

    const pantsDetails = order.needPants
      ? `${order.pantsColor || 'Black'} ${order.pantsSize} x${order.pantsQuantity || 1}`
      : ''

    return [
      order.orderNumber,
      order.firstName,
      order.lastName,
      order.shortName,
      order.jerseyNumber,
      jerseySummary,
      totalQty,
      order.needHat ? 'Yes' : 'No',
      hatDetails,
      order.needPants ? 'Yes' : 'No',
      pantsDetails,
      order.totalCost != null ? order.totalCost.toFixed(2) : '',
      order.status,
      order.createdAt ? new Date(order.createdAt).toLocaleString() : '',
    ]
  })

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
