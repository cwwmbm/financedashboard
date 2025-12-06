import * as fs from "fs"
import * as path from "path"
import { parseCSV, detectSubscriptions } from "../lib/csv-parser"
import type { Transaction } from "../lib/types"

const CSV_DIR = path.join(process.env.HOME || "", "Downloads/CSVs")

async function debugSubscriptionDetection() {
  console.log("🔍 Debugging Subscription Detection\n")
  console.log("=" .repeat(80))

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
    console.log(`✓ Parsed ${file}: ${transactions.length} transactions`)
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

  console.log(`\nTotal unique transactions: ${unique.length}`)

  // Detect subscriptions
  const withSubscriptions = detectSubscriptions(unique)
  const subscriptions = withSubscriptions.filter((t) => t.isSubscription)

  console.log(`\n📊 Subscription Detection Results:`)
  console.log(`Total subscriptions detected: ${subscriptions.length}`)

  // Group by vendor to see charge counts
  const byVendor = new Map<string, Transaction[]>()
  for (const sub of subscriptions) {
    const existing = byVendor.get(sub.vendor) || []
    existing.push(sub)
    byVendor.set(sub.vendor, existing)
  }

  console.log(`\n📋 Subscriptions by Vendor:`)
  console.log("-".repeat(80))

  const singleChargeSubs: Array<{ vendor: string; transactions: Transaction[] }> = []
  const multiChargeSubs: Array<{ vendor: string; count: number; transactions: Transaction[] }> = []

  for (const [vendor, transactions] of Array.from(byVendor.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    if (transactions.length === 1) {
      singleChargeSubs.push({ vendor, transactions })
    } else {
      multiChargeSubs.push({ vendor, count: transactions.length, transactions })
    }
  }

  // Show single-charge subscriptions (PROBLEM!)
  if (singleChargeSubs.length > 0) {
    console.log(`\n❌ PROBLEM: ${singleChargeSubs.length} vendors with ONLY 1 charge detected as subscription:`)
    for (const { vendor, transactions } of singleChargeSubs) {
      const t = transactions[0]
      console.log(`  - ${vendor}: $${t.amount.toFixed(2)} on ${t.date.toLocaleDateString()}`)
      console.log(`    Description: ${t.description.substring(0, 60)}`)
    }
  }

  // Show multi-charge subscriptions
  console.log(`\n✅ Multi-charge subscriptions (${multiChargeSubs.length} vendors):`)
  for (const { vendor, count, transactions } of multiChargeSubs.slice(0, 20)) {
    const dates = transactions
      .map((t) => t.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
      .join(", ")
    console.log(`  - ${vendor}: ${count} charges (${dates})`)
  }

  if (multiChargeSubs.length > 20) {
    console.log(`  ... and ${multiChargeSubs.length - 20} more`)
  }

  // Analyze why single charges are being detected
  if (singleChargeSubs.length > 0) {
    console.log(`\n🔬 Analyzing why single charges are detected:`)
    console.log("-".repeat(80))

    for (const { vendor, transactions } of singleChargeSubs.slice(0, 5)) {
      const t = transactions[0]
      console.log(`\nVendor: ${vendor}`)
      console.log(`  Amount: $${t.amount.toFixed(2)}`)
      console.log(`  Date: ${t.date.toLocaleDateString()}`)
      console.log(`  Description: ${t.description}`)

      // Simulate normalizeKey to see what key this transaction would have
      const { RecurringDetector } = require("../lib/csv-parser")
      // We can't access private methods, so let's check manually
      const desc = t.description.toLowerCase().replace(/\s+/g, " ").trim()
      const words = desc.split(/\s+/).filter((w) => w.length > 2)
      const keyWords = words.slice(0, 4).join(" ")
      const roundedAmount = Math.round(t.amount)
      const normalizedKey = `${keyWords}|${roundedAmount}`
      console.log(`  Normalized key: ${normalizedKey}`)

      // Find all transactions that would have the same normalized key
      const sameKeyTransactions = unique.filter((other) => {
        if (other.id === t.id) return false
        const otherDesc = other.description.toLowerCase().replace(/\s+/g, " ").trim()
        const otherWords = otherDesc.split(/\s+/).filter((w) => w.length > 2)
        const otherKeyWords = otherWords.slice(0, 4).join(" ")
        const otherRoundedAmount = Math.round(other.amount)
        const otherNormalizedKey = `${otherKeyWords}|${otherRoundedAmount}`
        return otherNormalizedKey === normalizedKey
      })

      console.log(`  Transactions with same normalized key: ${sameKeyTransactions.length}`)
      if (sameKeyTransactions.length > 0) {
        console.log(`  ⚠️  These should be grouped together!`)
        for (const sameKeyT of sameKeyTransactions.slice(0, 5)) {
          console.log(
            `    - $${sameKeyT.amount.toFixed(2)} on ${sameKeyT.date.toLocaleDateString()} (isSubscription: ${sameKeyT.isSubscription}, vendor: ${sameKeyT.vendor})`,
          )
        }
      } else {
        console.log(`  ❌ No other transactions with same key - this should NOT be a subscription!`)
      }
    }
  }

  console.log(`\n${"=".repeat(80)}`)
  console.log(`\nSummary:`)
  console.log(`  Total transactions: ${unique.length}`)
  console.log(`  Subscriptions detected: ${subscriptions.length}`)
  console.log(`  Single-charge subscriptions (ERROR): ${singleChargeSubs.length}`)
  console.log(`  Multi-charge subscriptions: ${multiChargeSubs.length}`)
}

debugSubscriptionDetection().catch(console.error)

