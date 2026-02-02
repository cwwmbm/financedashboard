import type { Transaction } from "./types"

/**
 * Escape CSV field value by wrapping in quotes if it contains special characters
 */
function escapeCSVField(value: string | number): string {
  const stringValue = String(value)
  // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/**
 * Export transactions to CSV format and trigger download
 * @param transactions - Array of transactions to export
 * @param filename - Optional filename (defaults to transactions_YYYY-MM-DD.csv)
 */
export function exportToCSV(transactions: Transaction[], filename?: string): void {
  if (transactions.length === 0) {
    alert("No transactions to export")
    return
  }

  // Sort transactions by date (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date)
    const dateB = b.date instanceof Date ? b.date : new Date(b.date)
    return dateA.getTime() - dateB.getTime()
  })

  // CSV Header
  const headers = ["Date", "Vendor Name", "Category", "Subscription", "Amount"]
  
  // CSV Rows
  const rows = sortedTransactions.map((transaction) => {
    const date = transaction.date instanceof Date 
      ? transaction.date.toISOString().split("T")[0] // Format: YYYY-MM-DD
      : new Date(transaction.date).toISOString().split("T")[0]
    
    const vendorName = escapeCSVField(transaction.vendor)
    const category = escapeCSVField(transaction.category)
    const subscription = transaction.isSubscription ? "yes" : "no"
    const amount = transaction.amount.toFixed(2)
    
    return [date, vendorName, category, subscription, amount].join(",")
  })
  
  // Combine header and rows
  const csvContent = [headers.join(","), ...rows].join("\n")
  
  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  
  // Generate filename with current date if not provided
  const defaultFilename = `transactions_${new Date().toISOString().split("T")[0]}.csv`
  const finalFilename = filename || defaultFilename
  
  // Create download link
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", finalFilename)
  link.style.visibility = "hidden"
  
  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Get count of transactions for display purposes
 */
export function getExportCount(transactions: Transaction[]): string {
  const count = transactions.length
  return count === 1 ? "1 transaction" : `${count} transactions`
}
