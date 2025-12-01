import type { Transaction } from "./types"

// Internal transaction type for parsing (before conversion to Transaction)
interface ParsedTransaction {
  date: Date
  amount: number
  description: string
  type: "debit" | "credit"
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food & Dining": [
    "restaurant",
    "cafe",
    "coffee",
    "food",
    "eat",
    "dining",
    "uber eats",
    "doordash",
    "grubhub",
    "mcdonald",
    "starbucks",
    "chipotle",
  ],
  Shopping: ["amazon", "walmart", "target", "ebay", "etsy", "shop", "store", "market"],
  Transportation: ["uber", "lyft", "gas", "fuel", "parking", "transit", "metro", "bus"],
  Entertainment: ["netflix", "spotify", "hulu", "disney", "movie", "theater", "concert", "game"],
  Utilities: ["electric", "water", "gas", "internet", "phone", "mobile", "verizon", "att", "comcast"],
  Health: ["pharmacy", "doctor", "hospital", "medical", "health", "cvs", "walgreens"],
  Travel: ["hotel", "airline", "flight", "airbnb", "booking", "expedia"],
}

function detectCategory(description: string): string {
  const lower = description.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category
    }
  }
  return "Other"
}

function extractVendor(description: string): string {
  // Clean up common prefixes and extract vendor name
  let vendor = description
    .replace(/^(pos |debit |credit |ach |check |wire |transfer )/i, "")
    .replace(/\d{4,}/g, "")
    .replace(/[#*]/g, "")
    .trim()

  // Take first meaningful part
  const parts = vendor.split(/\s{2,}|\/|\\|-/)
  vendor = parts[0]?.trim() || description

  // Capitalize properly
  return vendor
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .substring(0, 30)
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let currentField = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = i + 1 < line.length ? line[i + 1] : ""

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      fields.push(currentField)
      currentField = ""
    } else {
      currentField += char
    }
  }

  // Add last field
  fields.push(currentField)

  return fields
}

/**
 * Parse date string in various formats
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null

  const trimmed = dateStr.trim()

  // Try ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1])
    const month = parseInt(isoMatch[2]) - 1
    const day = parseInt(isoMatch[3])
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime())) return date
  }

  // Try MM/DD/YYYY or MM/DD/YY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (slashMatch) {
    const month = parseInt(slashMatch[1]) - 1
    const day = parseInt(slashMatch[2])
    let year = parseInt(slashMatch[3])
    if (year < 100) {
      // Assume 20XX for 2-digit years
      year += 2000
    }
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime())) return date
  }

  // Try DD/MM/YYYY (less common but possible)
  const ddmmMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (ddmmMatch) {
    const day = parseInt(ddmmMatch[1])
    const month = parseInt(ddmmMatch[2]) - 1
    const year = parseInt(ddmmMatch[3])
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime())) return date
  }

  // Try DD MMM. YYYY or DD MMM YYYY (American Express format: "21 Nov. 2025")
  const monthNames: { [key: string]: number } = {
    jan: 0,
    "jan.": 0,
    feb: 1,
    "feb.": 1,
    mar: 2,
    "mar.": 2,
    apr: 3,
    "apr.": 3,
    may: 4,
    "may.": 4,
    jun: 5,
    "jun.": 5,
    jul: 6,
    "jul.": 6,
    aug: 7,
    "aug.": 7,
    sep: 8,
    "sep.": 8,
    sept: 8,
    "sept.": 8,
    oct: 9,
    "oct.": 9,
    nov: 10,
    "nov.": 10,
    dec: 11,
    "dec.": 11,
  }

  const monthMatch = trimmed.match(/^(\d{1,2})\s+(\w{3,4}\.?)\s+(\d{4})/i)
  if (monthMatch) {
    const day = parseInt(monthMatch[1])
    const monthName = monthMatch[2].toLowerCase()
    const year = parseInt(monthMatch[3])

    if (monthNames[monthName] !== undefined) {
      const month = monthNames[monthName]
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) return date
    }
  }

  return null
}

/**
 * Parse Format 1: Name,Card,TransactionDate,PostingDate,Description,Currency,Debit,Credit
 */
function parseFormat1(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  for (const line of lines) {
    const fields = parseCSVLine(line)

    if (fields.length < 8) continue // Need at least 8 columns

    const [name, card, transDateStr, postDateStr, description, currency, debitStr, creditStr] = fields

    // Parse dates
    const transactionDate = parseDate(transDateStr)
    const postingDate = parseDate(postDateStr)
    const date = transactionDate || postingDate

    if (!date) continue

    // Determine amount and type
    let amount = 0
    let type: "debit" | "credit" = "debit"

    if (debitStr && debitStr.trim() !== "") {
      amount = parseFloat(debitStr)
      type = "debit"
    } else if (creditStr && creditStr.trim() !== "") {
      amount = parseFloat(creditStr)
      type = "credit"
    }

    if (isNaN(amount) || amount === 0) continue

    // Clean description
    const cleanDescription = description.trim()

    if (cleanDescription.length < 2) continue

    transactions.push({
      date,
      amount: Math.abs(amount),
      description: cleanDescription,
      type,
    })
  }

  return transactions
}

/**
 * Parse Format 2: Posted Date,Payee,Address,Amount (with header)
 */
function parseFormat2(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Skip header line
  const dataLines = lines.slice(1)

  for (const line of dataLines) {
    const fields = parseCSVLine(line)

    if (fields.length < 4) continue

    const [dateStr, payee, address, amountStr] = fields

    // Parse date
    const date = parseDate(dateStr)
    if (!date) continue

    // Parse amount
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount === 0) continue

    // Determine type: negative = debit, positive = credit
    const type: "debit" | "credit" = amount < 0 ? "debit" : "credit"

    // Clean description (use payee, optionally include address)
    let description = payee.trim()
    if (address && address.trim() && address.trim() !== " ") {
      // Sometimes address adds useful context
      description = `${description} ${address.trim()}`.trim()
    }

    if (description.length < 2) continue

    transactions.push({
      date,
      amount: Math.abs(amount),
      description,
      type,
    })
  }

  return transactions
}

/**
 * Parse Format 3: American Express format with "Date,Description,,Amount" header
 * Also handles variant: "Date,Date Processed,Description,Amount,..."
 */
function parseFormat3(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Find the header row that says "Date,Description,,Amount" or "Date,Date Processed,Description,Amount"
  let headerIndex = -1
  let dateIndex = 0
  let descIndex = 1
  let amountIndex = 3

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    if (line.includes("date") && line.includes("description") && line.includes("amount")) {
      headerIndex = i
      // Parse header to find exact column indices
      const headerFields = parseCSVLine(lines[i])
      dateIndex = headerFields.findIndex((f) => f.toLowerCase().trim() === "date")
      descIndex = headerFields.findIndex((f) => f.toLowerCase().includes("description"))
      amountIndex = headerFields.findIndex((f) => f.toLowerCase().includes("amount") && !f.toLowerCase().includes("foreign"))
      
      // If we have "Date Processed", skip it and use Description as the next column
      const dateProcessedIndex = headerFields.findIndex((f) => f.toLowerCase().includes("date processed"))
      if (dateProcessedIndex !== -1 && descIndex === dateProcessedIndex + 1) {
        // This is the variant format: Date,Date Processed,Description,Amount
        // descIndex should already be correct, but let's verify
      }
      
      break
    }
  }

  if (headerIndex === -1) {
    // Try to find transactions without explicit header
    return parseFormat3NoHeader(lines)
  }

  // Process lines after header
  const dataLines = lines.slice(headerIndex + 1)

  for (const line of dataLines) {
    const fields = parseCSVLine(line)

    if (fields.length < Math.max(dateIndex, descIndex, amountIndex) + 1) continue

    const dateStr = fields[dateIndex] || ""
    const description = fields[descIndex] || ""
    const amountStr = fields[amountIndex] || ""

    // Skip summary rows
    if (
      description.toLowerCase().includes("summary") ||
      description.toLowerCase().includes("last billed") ||
      description.toLowerCase().includes("charges &") ||
      description.toLowerCase().includes("payments &")
    ) {
      continue
    }

    // Parse date (format: "21 Nov. 2025" or "21 Nov 2025")
    const date = parseDate(dateStr)
    if (!date) continue

    // Parse amount (format: "$12.59" or "-$5,736.71")
    const cleanAmount = amountStr.replace(/[\$,]/g, "")
    const amount = parseFloat(cleanAmount)
    if (isNaN(amount) || amount === 0) continue

    // Determine type: negative = credit/payment, positive = debit/charge
    const type: "debit" | "credit" = amount > 0 ? "debit" : "credit"

    // Clean description - make sure it's not empty and not just a date
    let cleanDescription = description.trim()
    
    // If description is empty or looks like a date, skip this transaction
    if (cleanDescription.length < 2) continue
    
    // Check if description is actually a date (shouldn't happen, but safety check)
    const dateCheck = parseDate(cleanDescription)
    if (dateCheck && cleanDescription.match(/^\d{1,2}\s+\w{3,4}\.?\s+\d{4}$/i)) {
      // Description is a date, which means the CSV format is wrong - skip
      continue
    }

    transactions.push({
      date,
      amount: Math.abs(amount),
      description: cleanDescription,
      type,
    })
  }

  return transactions
}

/**
 * Parse Format 3 without explicit header (fallback)
 */
function parseFormat3NoHeader(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  for (const line of lines) {
    const fields = parseCSVLine(line)

    if (fields.length < 2) continue

    // Look for date in first field and amount in last field
    const dateStr = fields[0]
    const date = parseDate(dateStr)
    if (!date) continue

    // Try to find amount in any field
    let amountStr = ""
    let description = ""

    for (let i = fields.length - 1; i >= 0; i--) {
      const field = fields[i]
      if (field.match(/^[\-]?\$?[\d,]+\.?\d{0,2}$/)) {
        amountStr = field
        // Description is everything between date and amount
        description = fields.slice(1, i).join(" ").trim()
        break
      }
    }

    if (!amountStr) continue

    const cleanAmount = amountStr.replace(/[\$,]/g, "")
    const amount = parseFloat(cleanAmount)
    if (isNaN(amount) || amount === 0) continue

    const type: "debit" | "credit" = amount > 0 ? "debit" : "credit"

    // Skip if description is empty or looks like a date
    if (description.length < 2) continue
    
    // Check if description is actually a date (shouldn't happen, but safety check)
    const dateCheck = parseDate(description)
    if (dateCheck && description.match(/^\d{1,2}\s+\w{3,4}\.?\s+\d{4}$/i)) {
      // Description is a date, which means the CSV format is wrong - skip
      continue
    }

    transactions.push({
      date,
      amount: Math.abs(amount),
      description,
      type,
    })
  }

  return transactions
}

/**
 * Recurring payment detector - identifies subscriptions based on patterns
 */
class RecurringDetector {
  /**
   * Detect recurring payments from a list of transactions
   * Returns a Set of transaction keys that are subscriptions
   */
  detectRecurringPayments(transactions: ParsedTransaction[]): Set<string> {
    const subscriptionKeys = new Set<string>()

    // Filter to only debit transactions (subscriptions are typically debits)
    const debits = transactions.filter((t) => t.type === "debit")

    // Group transactions by normalized description and amount (original working approach)
    const groups = new Map<string, ParsedTransaction[]>()

    for (const transaction of debits) {
      const key = this.normalizeKey(transaction)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(transaction)
    }


    // Find groups with multiple occurrences (likely recurring)
    for (const [key, groupTransactions] of groups.entries()) {
      if (groupTransactions.length < 2) continue // Need at least 2 occurrences

      // Sort by date
      groupTransactions.sort((a, b) => a.date.getTime() - b.date.getTime())

      // Check if amounts are similar (within 10% variance for subscriptions)
      // Some subscriptions may have slight price changes
      const amounts = groupTransactions.map((t) => t.amount)
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const minAmount = Math.min(...amounts)
      const maxAmount = Math.max(...amounts)
      const variance = (maxAmount - minAmount) / avgAmount

      // Allow up to 10% variance, or if only 2 transactions, be more lenient (20%)
      const maxVariance = groupTransactions.length === 2 ? 0.2 : 0.1

      if (variance > maxVariance && groupTransactions.length < 3) {
        // If amounts vary significantly and only 2 occurrences, might not be recurring
        continue
      }

      // Check if transactions occur on the same day of month (within +/- 1 day)
      // This filters out one-time purchases that happen to occur at the same merchant
      const sameDay = this.isSameDayOfMonth(groupTransactions)
      if (!sameDay) {
        continue
      }

      // Mark all transactions in this group as subscriptions
      for (const transaction of groupTransactions) {
        const transactionKey = `${transaction.date.getTime()}-${transaction.amount}-${transaction.description}`
        subscriptionKeys.add(transactionKey)
      }
    }

    return subscriptionKeys
  }

  /**
   * Normalize transaction key for grouping (restored from original working version)
   */
  private normalizeKey(transaction: ParsedTransaction): string {
    // Normalize description: lowercase, remove extra spaces, remove common prefixes
    let desc = transaction.description
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()

    // Remove common prefixes that might vary
    desc = desc.replace(/^(purchase|debit|payment|transfer|ach|autopay|automatic|card)\s+/i, "")
    desc = desc.replace(/\s+(purchase|debit|payment|transfer)$/i, "")

    // Remove transaction IDs, reference numbers, confirmation codes, etc.
    desc = desc.replace(/\b\d{10,}\b/g, "") // Remove long numbers (likely IDs)
    desc = desc.replace(/\b[a-z0-9]{8,}\b/gi, "") // Remove long alphanumeric codes (like P3A5017B5F)
    desc = desc.replace(/\*\d{4}/g, "") // Remove card last 4 digits like *1234

    // Remove common suffixes like "ONLINE", "AUTHORIZED", etc.
    desc = desc.replace(/\s+(online|authorized|pending|completed|processed)$/i, "")

    // Remove extra whitespace
    desc = desc.replace(/\s+/g, " ").trim()

    // Extract key merchant/service name (first few meaningful words)
    const words = desc.split(/\s+/).filter((w) => w.length > 2)
    const keyWords = words.slice(0, 4).join(" ") // Use first 4 meaningful words

    // Round amount to nearest dollar for grouping (subscriptions are usually same amount)
    const roundedAmount = Math.round(transaction.amount)

    return `${keyWords}|${roundedAmount}`
  }

  /**
   * Check if transactions occur on the same day of month (within +/- 1 day)
   * This helps filter out one-time purchases that happen to occur at the same merchant
   * Requirements: payments must occur on the same day every month +/- 1 day
   */
  private isSameDayOfMonth(transactions: ParsedTransaction[]): boolean {
    if (transactions.length < 2) return false

    // Get the day of month for each transaction
    const daysOfMonth = transactions.map((t) => t.date.getDate())

    // Find the most common day (or average if tied)
    const dayCounts = new Map<number, number>()
    for (const day of daysOfMonth) {
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
    }

    // Get the day that appears most often
    let mostCommonDay = daysOfMonth[0]
    let maxCount = 0
    for (const [day, count] of dayCounts.entries()) {
      if (count > maxCount) {
        maxCount = count
        mostCommonDay = day
      }
    }

    // Check if all days are within +/- 1 day of the most common day
    // Also handle month-end wraparound (e.g., 30th/31st to 1st/2nd)
    const allWithinRange = daysOfMonth.every((day) => {
      const diff = Math.abs(day - mostCommonDay)
      // Within 1 day, or handle wraparound at month boundaries
      if (diff <= 1) return true

      // Handle month-end wraparound: 30/31 to 1/2 should be considered close
      if (mostCommonDay >= 29 && day <= 2) return true // e.g., 30th/31st to 1st/2nd
      if (day >= 29 && mostCommonDay <= 2) return true // e.g., 1st/2nd to 30th/31st

      return false
    })

    return allWithinRange
  }
}

/**
 * Main CSV parser function - detects format and parses accordingly
 */
export function parseCSV(content: string): Transaction[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  // Detect format by checking content
  const contentLower = content.toLowerCase()
  let parsedTransactions: ParsedTransaction[] = []

  // Check for Format 3: Look for "Date,Description,,Amount" header pattern
  const hasFormat3Header = lines.some((line) => {
    const lower = line.toLowerCase()
    return lower.includes("date") && lower.includes("description") && lower.includes("amount") && !lower.includes("posted date")
  })

  if (contentLower.includes("american express") || contentLower.includes("amex") || hasFormat3Header) {
    // Format 3: American Express format
    parsedTransactions = parseFormat3(lines)
  } else if (lines[0].toLowerCase().includes("posted date") || lines[0].toLowerCase().includes("payee")) {
    // Format 2: Header with "Posted Date,Payee,Address,Amount"
    parsedTransactions = parseFormat2(lines)
  } else if (lines[0].includes(",") && lines[0].split(",").length >= 8) {
    // Format 1: Name,Card,TransactionDate,PostingDate,Description,Currency,Debit,Credit
    parsedTransactions = parseFormat1(lines)
  } else {
    // Fallback: Try to parse with simple format detection
    const header = lines[0].toLowerCase()
    const hasHeader = header.includes("date") || header.includes("amount") || header.includes("description")
    const dataLines = hasHeader ? lines.slice(1) : lines

    parsedTransactions = []
    let dateIndex = 0
    let descIndex = 1
    let amountIndex = 2

    // Try to detect column positions from header
    if (hasHeader) {
      const cols = parseCSVLine(lines[0]).map((c) => c.toLowerCase().trim())
      dateIndex = cols.findIndex((c) => c.includes("date"))
      descIndex = cols.findIndex((c) => c.includes("description") || c.includes("memo") || c.includes("name"))
      amountIndex = cols.findIndex((c) => c.includes("amount") || c.includes("debit") || c.includes("credit"))

      if (dateIndex === -1) dateIndex = 0
      if (descIndex === -1) descIndex = 1
      if (amountIndex === -1) amountIndex = 2
    }

    for (const line of dataLines) {
      if (!line.trim()) continue

      const cols = parseCSVLine(line)
      const dateStr = cols[dateIndex] || ""
      let description = cols[descIndex] || ""
      let amountStr = cols[amountIndex] || "0"

      // If description is empty, try to find it in other columns
      if (!description || description.trim().length < 2) {
        // Try next column after date
        if (cols.length > dateIndex + 1) {
          description = cols[dateIndex + 1] || ""
        }
      }

      // Parse amount - handle negative and various formats
      amountStr = amountStr.replace(/[$,()]/g, "").trim()
      if (amountStr.startsWith("(") || amountStr.endsWith(")")) {
        amountStr = "-" + amountStr.replace(/[()]/g, "")
      }
      const amount = Number.parseFloat(amountStr)

      if (isNaN(amount) || !dateStr) continue

      // Parse date
      const date = parseDate(dateStr)
      if (!date || isNaN(date.getTime())) continue

      // Skip if description is empty or looks like a date
      const cleanDescription = description.trim()
      if (cleanDescription.length < 2) continue
      
      // Check if description is actually a date (shouldn't happen, but safety check)
      const dateCheck = parseDate(cleanDescription)
      if (dateCheck && cleanDescription.match(/^\d{1,2}\s+\w{3,4}\.?\s+\d{4}$/i)) {
        // Description is a date, which means the CSV format is wrong - skip
        continue
      }

      // Determine type: negative = debit, positive = credit
      const type: "debit" | "credit" = amount < 0 ? "debit" : "credit"

      parsedTransactions.push({
        date,
        amount: Math.abs(amount),
        description: cleanDescription,
        type,
      })
    }
  }

  // Convert to Transaction format (subscription detection will happen after all files are combined)
  const transactions: Transaction[] = parsedTransactions.map((t) => {
    return {
      id: crypto.randomUUID(),
      date: t.date,
      description: t.description,
      amount: t.amount,
      vendor: extractVendor(t.description),
      category: detectCategory(t.description),
      isSubscription: false, // Will be set after all transactions are combined
      type: t.type, // Preserve debit/credit type
    }
  })

  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
}

/**
 * Detect subscriptions on a combined set of transactions (call this after combining all CSV files)
 */
export function detectSubscriptions(transactions: Transaction[]): Transaction[] {
  // Convert to ParsedTransaction format for detection
  // Only detect subscriptions on debit transactions (credits are payments, not subscriptions)
  const parsedTransactions: ParsedTransaction[] = transactions
    .filter((t) => t.type === "debit") // Only check debits for subscriptions
    .map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
      type: t.type,
    }))

  // Use recurring detector to identify subscriptions
  const detector = new RecurringDetector()
  const subscriptionKeys = detector.detectRecurringPayments(parsedTransactions)

  // Update transactions with subscription flags
  // Only mark debits as subscriptions (credits are payments)
  return transactions.map((t) => {
    const transactionKey = `${t.date.getTime()}-${t.amount}-${t.description}`
    return {
      ...t,
      // Only mark as subscription if it's a debit and was detected as recurring
      isSubscription: t.type === "debit" && subscriptionKeys.has(transactionKey),
    }
  })
}
