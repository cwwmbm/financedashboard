import * as fs from "fs"
import * as path from "path"
import { parseCSV } from "../lib/csv-parser"
import type { Transaction, ParsedTransaction } from "../lib/types"

// Copy the RecurringDetector class with logging
class RecurringDetectorWithLogging {
  detectRecurringPayments(transactions: ParsedTransaction[]): Set<string> {
    const subscriptionKeys = new Set<string>()
    const debits = transactions.filter((t) => t.type === "debit")
    const groups = new Map<string, ParsedTransaction[]>()

    for (const transaction of debits) {
      const key = this.normalizeKey(transaction)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(transaction)
    }

    console.log(`\n🔍 Detection Analysis:`)
    console.log("=".repeat(80))
    console.log(`Total groups: ${groups.size}`)
    
    // Find Supabase, Vercel, and Be Fresh Local groups
    const targetKeys = Array.from(groups.entries()).filter(([key]) => 
      key.toLowerCase().includes("fresh") || 
      key.toLowerCase().includes("local") ||
      key.toLowerCase().includes("supabase") ||
      key.toLowerCase().includes("vercel")
    )
    
    console.log(`\nTarget groups found: ${targetKeys.length}`)
    for (const [key, groupTransactions] of targetKeys) {
      console.log(`\n  Key: "${key}"`)
      console.log(`  Transactions in group: ${groupTransactions.length}`)
      for (const t of groupTransactions) {
        console.log(`    - $${t.amount} on ${t.date.toLocaleDateString()}: ${t.description.substring(0, 50)}`)
      }
      
      if (groupTransactions.length === 1) {
        console.log(`  ❌ SKIPPED: Only 1 transaction`)
        continue
      }
      
      if (groupTransactions.length < 2) {
        console.log(`  ❌ SKIPPED: Less than 2 transactions`)
        continue
      }
      
      // Check same day
      const firstDate = groupTransactions[0].date
      const allSameDay = groupTransactions.every((t) => {
        return t.date.getFullYear() === firstDate.getFullYear() &&
               t.date.getMonth() === firstDate.getMonth() &&
               t.date.getDate() === firstDate.getDate()
      })
      if (allSameDay) {
        console.log(`  ❌ SKIPPED: All on same day`)
        continue
      }
      
      // Check 2 transactions
      if (groupTransactions.length === 2) {
        const daysDiff = Math.abs(
          (groupTransactions[1].date.getTime() - groupTransactions[0].date.getTime()) / (1000 * 60 * 60 * 24)
        )
        console.log(`  Days apart: ${daysDiff.toFixed(1)}`)
        if (daysDiff < 20) {
          console.log(`  ❌ SKIPPED: Less than 20 days apart`)
          continue
        }
      }
      
      // Check same day of month
      const sameDay = this.isSameDayOfMonth(groupTransactions)
      console.log(`  Same day of month check: ${sameDay}`)
      if (!sameDay) {
        console.log(`  ❌ SKIPPED: Not on same day of month`)
        continue
      }
      
      console.log(`  ✅ PASSED ALL CHECKS - Marking as subscription`)
      for (const transaction of groupTransactions) {
        const transactionKey = `${transaction.date.getTime()}-${transaction.amount}-${transaction.description}`
        subscriptionKeys.add(transactionKey)
        console.log(`    Marked: ${transactionKey.substring(0, 60)}...`)
      }
    }

    return subscriptionKeys
  }

  private normalizeKey(transaction: ParsedTransaction): string {
    let desc = transaction.description
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
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
    const roundedAmount = Math.round(transaction.amount)
    return `${keyWords}|${roundedAmount}`
  }

  private isSameDayOfMonth(transactions: ParsedTransaction[]): boolean {
    if (transactions.length < 2) return false
    const daysOfMonth = transactions.map((t) => t.date.getDate())
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
    return allWithinRange
  }
}

const CSV_DIR = path.join(process.env.HOME || "", "Downloads/CSVs")
const files = fs.readdirSync(CSV_DIR).filter((f) => f.endsWith(".csv"))

let allTransactions: Transaction[] = []
for (const file of files) {
  const filePath = path.join(CSV_DIR, file)
  const content = fs.readFileSync(filePath, "utf-8")
  const transactions = parseCSV(content)
  allTransactions.push(...transactions)
}

const unique = allTransactions.filter(
  (t, i, arr) =>
    arr.findIndex(
      (x) =>
        x.date.getTime() === t.date.getTime() &&
        x.amount === t.amount &&
        x.description === t.description,
    ) === i,
)

const parsedTransactions: ParsedTransaction[] = unique
  .filter((t) => t.type === "debit")
  .map((t) => ({
    date: t.date,
    amount: t.amount,
    description: t.description,
    type: t.type,
  }))

const detector = new RecurringDetectorWithLogging()
const subscriptionKeys = detector.detectRecurringPayments(parsedTransactions)

console.log(`\n\n📊 Final Results:`)
console.log(`Total subscription keys: ${subscriptionKeys.size}`)

