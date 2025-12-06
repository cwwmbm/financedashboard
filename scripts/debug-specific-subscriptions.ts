import * as fs from "fs"
import * as path from "path"
import { parseCSV, detectSubscriptions } from "../lib/csv-parser"
import type { Transaction } from "../lib/types"

const CSV_DIR = path.join(process.env.HOME || "", "Downloads/CSVs")

async function debugSpecificSubscriptions() {
  console.log("🔍 Debugging Specific Subscriptions\n")
  console.log("=".repeat(80))

  // Get all CSV files
  const files = fs.readdirSync(CSV_DIR).filter((f) => f.endsWith(".csv"))
  console.log(`Found ${files.length} CSV files\n`)

  let allTransactions: Transaction[] = []

  // Parse all CSV files
  for (const file of files) {
    const filePath = path.join(CSV_DIR, file)
    const content = fs.readFileSync(filePath, "utf-8")
    const transactions = parseCSV(content)
    allTransactions.push(...transactions)
  }

  // Remove duplicates
  const unique = allTransactions.filter(
    (t, i, arr) =>
      arr.findIndex(
        (x) =>
          x.date.getTime() === t.date.getTime() &&
          x.amount === t.amount &&
          x.description === t.description,
      ) === i,
  )

  console.log(`Total unique transactions: ${unique.length}\n`)

  // Detect subscriptions
  const withSubscriptions = detectSubscriptions(unique)
  const subscriptions = withSubscriptions.filter((t) => t.isSubscription)

  // Target subscriptions to debug
  const targets = ["vercel", "openai", "google gsuite", "supabase"]

  for (const target of targets) {
    console.log(`\n${"=".repeat(80)}`)
    console.log(`📋 Analyzing: ${target.toUpperCase()}`)
    console.log("=".repeat(80))

    // Find all transactions (subscription and non-subscription) for this vendor
    const allVendorTransactions = unique.filter((t) =>
      t.description.toLowerCase().includes(target) || t.vendor.toLowerCase().includes(target),
    )

    console.log(`\nTotal transactions found: ${allVendorTransactions.length}`)

    // Group by normalized key to see how they're being grouped
    // Simulate the normalizeKey function from RecurringDetector
    function normalizeKey(transaction: Transaction): string {
      let desc = transaction.description
      // Remove location suffixes BEFORE lowercasing
      desc = desc.replace(/\s{2,}[A-Z]{4,}\s*$/g, "").trim()
      desc = desc.toLowerCase().replace(/\s+/g, " ").trim()
      desc = desc.replace(/^(purchase|debit|payment|transfer|ach|autopay|automatic|card)\s+/i, "")
      desc = desc.replace(/\s+(purchase|debit|payment|transfer)$/i, "")
      desc = desc.replace(/\b\d{10,}\b/g, "")
      desc = desc.replace(/\b[a-z0-9]{6,12}\b/gi, "")
      desc = desc.replace(/\b[a-z0-9]{8,}\b/gi, "")
      desc = desc.replace(/\*\d{4}/g, "")
      desc = desc.replace(/\s+(online|authorized|pending|completed|processed)$/i, "")
      desc = desc.replace(/\s+/g, " ").trim()
      const words = desc.split(/\s+/).filter((w) => w.length > 2)
      const keyWords = words.slice(0, 4).join(" ")
      const roundedAmount = Math.round(transaction.amount / 2) * 2
      return `${keyWords}|${roundedAmount}`
    }

    // Simulate the grouping
    const debits = allVendorTransactions.filter((t) => t.type === "debit")
    const groups = new Map<string, Transaction[]>()

    for (const transaction of debits) {
      const key = normalizeKey(transaction)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(transaction)
    }

    console.log(`\nGroups created: ${groups.size}`)
    for (const [key, transactions] of groups.entries()) {
      console.log(`\n  Key: "${key}"`)
      console.log(`  Transactions: ${transactions.length}`)
      const subscriptionCount = transactions.filter((t) => t.isSubscription).length
      console.log(`  Marked as subscription: ${subscriptionCount}`)

      // Sort by date
      const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime())
      for (const t of sorted) {
        const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        const subMark = t.isSubscription ? "✅" : "❌"
        console.log(`    ${subMark} ${dateStr} | $${t.amount.toFixed(2)} | ${t.description.substring(0, 60)}`)
      }

      // Check why it might not be detected
      if (transactions.length >= 2 && subscriptionCount === 0) {
        console.log(`\n  ⚠️  WHY NOT DETECTED?`)
        const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime())
        
        // Check amounts variance
        const amounts = transactions.map((t) => t.amount)
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
        const minAmount = Math.min(...amounts)
        const maxAmount = Math.max(...amounts)
        const variance = (maxAmount - minAmount) / avgAmount
        const maxVariance = transactions.length === 2 ? 0.2 : 0.1
        console.log(`    Amount variance: ${(variance * 100).toFixed(1)}% (max: ${(maxVariance * 100).toFixed(0)}%)`)
        if (variance > maxVariance && transactions.length < 3) {
          console.log(`    ❌ FAILED: Amount variance too high`)
        }
        
        if (sorted.length === 2) {
          const daysDiff = Math.abs(
            (sorted[1].date.getTime() - sorted[0].date.getTime()) / (1000 * 60 * 60 * 24),
          )
          console.log(`    Days apart: ${daysDiff.toFixed(1)}`)
          const isMonthly = daysDiff >= 20 && daysDiff <= 40
          const isAnnual = daysDiff >= 350 && daysDiff <= 380
          console.log(`    Monthly range (20-40): ${isMonthly}`)
          console.log(`    Annual range (350-380): ${isAnnual}`)
          if (!isMonthly && !isAnnual) {
            console.log(`    ❌ FAILED: Not in monthly or annual range`)
          }

          // Check same day of month
          const day1 = sorted[0].date.getDate()
          const day2 = sorted[1].date.getDate()
          const diff = Math.abs(day1 - day2)
          const sameDay = diff <= 1 || (day1 >= 29 && day2 <= 2) || (day2 >= 29 && day1 <= 2)
          console.log(`    Days of month: ${day1} vs ${day2} (diff: ${diff})`)
          console.log(`    Same day check: ${sameDay}`)
          if (!sameDay) {
            console.log(`    ❌ FAILED: Not on same day of month`)
          }
        } else if (sorted.length >= 3) {
          // Check if they span multiple months
          const uniqueMonths = new Set(
            sorted.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`)
          )
          console.log(`    Unique months: ${uniqueMonths.size}`)
          if (uniqueMonths.size < 2) {
            console.log(`    ❌ FAILED: All transactions in same month`)
          }
          
          // Check same day of month
          const daysOfMonth = sorted.map((t) => t.date.getDate())
          const dayCounts = new Map<number, number>()
          for (const day of daysOfMonth) {
            dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
          }
          let mostCommonDay = daysOfMonth[0]
          let maxCount = 0
          for (const [day, count] of dayCounts.entries()) {
            if (count > maxCount) {
              maxCount = count
              mostCommonDay = day
            }
          }
          const allWithinRange = daysOfMonth.every((day) => {
            const diff = Math.abs(day - mostCommonDay)
            if (diff <= 1) return true
            if (mostCommonDay >= 29 && day <= 2) return true
            if (day >= 29 && mostCommonDay <= 2) return true
            return false
          })
          console.log(`    Most common day: ${mostCommonDay}`)
          console.log(`    All within +/-1 day: ${allWithinRange}`)
          if (!allWithinRange) {
            console.log(`    ❌ FAILED: Not all on same day of month`)
          }
        }
      }
    }

    // Show which transactions are marked as subscriptions
    const subscriptionTransactions = allVendorTransactions.filter((t) => t.isSubscription)
    console.log(`\n✅ Marked as subscriptions: ${subscriptionTransactions.length}`)
    if (subscriptionTransactions.length > 0) {
      const sorted = [...subscriptionTransactions].sort((a, b) => b.date.getTime() - a.date.getTime())
      for (const t of sorted) {
        const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        console.log(`  - ${dateStr} | $${t.amount.toFixed(2)}`)
      }
    }

    // Show which transactions are NOT marked
    const nonSubscriptionTransactions = allVendorTransactions.filter(
      (t) => !t.isSubscription && t.type === "debit",
    )
    console.log(`\n❌ NOT marked as subscriptions: ${nonSubscriptionTransactions.length}`)
    if (nonSubscriptionTransactions.length > 0) {
      const sorted = [...nonSubscriptionTransactions].sort((a, b) => b.date.getTime() - a.date.getTime())
      for (const t of sorted.slice(0, 10)) {
        const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        console.log(`  - ${dateStr} | $${t.amount.toFixed(2)} | ${t.description.substring(0, 50)}`)
      }
      if (nonSubscriptionTransactions.length > 10) {
        console.log(`  ... and ${nonSubscriptionTransactions.length - 10} more`)
      }
    }
  }

  console.log(`\n${"=".repeat(80)}`)
}

debugSpecificSubscriptions().catch(console.error)

