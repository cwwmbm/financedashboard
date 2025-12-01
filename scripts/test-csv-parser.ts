import * as fs from "fs"
import * as path from "path"
import { parseCSV, detectSubscriptions } from "../lib/csv-parser"
import type { Transaction } from "../lib/types"

// Load expected results from PDFScanner
const expectedResultsPath = path.join(__dirname, "../../PDFScanner/recurring-payments.json")
const expectedResults = JSON.parse(fs.readFileSync(expectedResultsPath, "utf-8"))

// Get CSV files
const csvDir = path.join(__dirname, "../../PDFScanner/CSV")
const csvFiles = fs
  .readdirSync(csvDir)
  .filter((file) => file.toLowerCase().endsWith(".csv"))
  .map((file) => path.join(csvDir, file))

console.log("🔍 Testing CSV Parser with Subscription Detection\n")
console.log(`Found ${csvFiles.length} CSV files\n`)

// Parse all CSV files
const allTransactions: Transaction[] = []
for (const filePath of csvFiles) {
  console.log(`📄 Processing: ${path.basename(filePath)}...`)
  const content = fs.readFileSync(filePath, "utf-8")
  const transactions = parseCSV(content)
  allTransactions.push(...transactions)
  console.log(`   ✓ Parsed ${transactions.length} transactions`)
}

console.log(`\n📊 Total transactions: ${allTransactions.length}`)

// Remove duplicates
const unique = allTransactions.filter(
  (t, i, arr) =>
    arr.findIndex(
      (x) => x.date.getTime() === t.date.getTime() && x.amount === t.amount && x.description === t.description,
    ) === i,
)

console.log(`📊 Unique transactions: ${unique.length}`)

// Detect subscriptions on combined set
console.log("\n🔍 Detecting subscriptions on combined transactions...")
const withSubscriptions = detectSubscriptions(unique)

// Group subscriptions
const subscriptions = withSubscriptions.filter((t) => t.isSubscription)
const nonSubscriptions = withSubscriptions.filter((t) => !t.isSubscription)

console.log(`\n✅ Detected ${subscriptions.length} subscriptions`)
console.log(`❌ Marked ${nonSubscriptions.length} as non-subscriptions`)

// Compare with expected results
console.log(`\n📋 Expected ${expectedResults.recurringPayments.length} recurring payments\n`)

// Debug: Check Spotify transactions and their grouping keys
console.log("\n🔍 Debug: Spotify Transaction Analysis")
console.log("=" .repeat(80))
const spotifyAll = withSubscriptions.filter((t) => t.description.toLowerCase().includes("spotify"))
console.log(`\nTotal Spotify transactions found: ${spotifyAll.length}`)
for (const t of spotifyAll) {
  console.log(`  ${t.date.toISOString().split("T")[0]} | $${t.amount.toFixed(2)} | ${t.description.substring(0, 50)} | Sub: ${t.isSubscription}`)
}

// Group detected subscriptions by vendor/description
const detectedByVendor = new Map<string, Transaction[]>()
for (const sub of subscriptions) {
  const key = sub.vendor.toLowerCase()
  if (!detectedByVendor.has(key)) {
    detectedByVendor.set(key, [])
  }
  detectedByVendor.get(key)!.push(sub)
}

// Show detected subscriptions
console.log("🔍 Detected Subscriptions:")
console.log("=" .repeat(80))
for (const [vendor, transactions] of detectedByVendor.entries()) {
  const amounts = transactions.map((t) => t.amount)
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const dates = transactions.map((t) => t.date.toISOString().split("T")[0]).sort()
  console.log(`\n${vendor.toUpperCase()}`)
  console.log(`  Count: ${transactions.length}`)
  console.log(`  Avg Amount: $${avgAmount.toFixed(2)}`)
  console.log(`  Dates: ${dates.join(", ")}`)
  console.log(`  Sample: ${transactions[0].description}`)
}

// Show expected subscriptions
console.log("\n\n📋 Expected Subscriptions (from PDFScanner):")
console.log("=" .repeat(80))
for (const expected of expectedResults.recurringPayments) {
  console.log(`\n${expected.description}`)
  console.log(`  Count: ${expected.occurrences}`)
  console.log(`  Amount: $${expected.amount.toFixed(2)}`)
  console.log(`  Frequency: ${expected.frequency}`)
}

// Check for missing subscriptions
console.log("\n\n❌ Missing Subscriptions:")
console.log("=" .repeat(80))
for (const expected of expectedResults.recurringPayments) {
  const descLower = expected.description.toLowerCase()
  const found = subscriptions.some((t) => t.description.toLowerCase().includes(descLower.split(" ")[0]))
  if (!found) {
    console.log(`  ❌ ${expected.description} (${expected.occurrences} occurrences, $${expected.amount.toFixed(2)})`)
  }
}

// Check Spotify specifically
console.log("\n\n🎵 Spotify Analysis:")
console.log("=" .repeat(80))
const spotifyTransactions = allTransactions.filter((t) =>
  t.description.toLowerCase().includes("spotify"),
)
console.log(`Total Spotify transactions: ${spotifyTransactions.length}`)
const spotifySubs = spotifyTransactions.filter((t) => t.isSubscription)
const spotifyNonSubs = spotifyTransactions.filter((t) => !t.isSubscription)
console.log(`  ✅ Marked as subscription: ${spotifySubs.length}`)
console.log(`  ❌ Marked as non-subscription: ${spotifyNonSubs.length}`)

if (spotifyTransactions.length > 0) {
  console.log("\nSpotify transaction details:")
  for (const t of spotifyTransactions) {
    console.log(
      `  ${t.date.toISOString().split("T")[0]} | $${t.amount.toFixed(2)} | ${t.description.substring(0, 60)} | Sub: ${t.isSubscription}`,
    )
  }
}

// Save results for inspection
const outputPath = path.join(__dirname, "../data/test-results.json")
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      totalTransactions: allTransactions.length,
      detectedSubscriptions: subscriptions.length,
      subscriptions: subscriptions.map((t) => ({
        date: t.date.toISOString(),
        amount: t.amount,
        description: t.description,
        vendor: t.vendor,
      })),
      expectedSubscriptions: expectedResults.recurringPayments.length,
    },
    null,
    2,
  ),
)
console.log(`\n💾 Results saved to: ${outputPath}`)

