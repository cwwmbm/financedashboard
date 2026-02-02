import * as fs from "fs"
import * as path from "path"
import type { Transaction } from "../lib/types"
import {
  normalizeVendorForGrouping,
  findVendorVariants,
  autoMergeVendors,
} from "../lib/csv-parser"

async function detectVendorVariants() {
  console.log("🔍 Vendor Variant Detection\n")

  // Load transactions
  const transactionsPath = path.join(__dirname, "../data/transactions.json")
  if (!fs.existsSync(transactionsPath)) {
    console.error(`❌ Transactions file not found: ${transactionsPath}`)
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(transactionsPath, "utf-8"))
  const transactions: Transaction[] = data.transactions.map((t: any) => ({
    ...t,
    date: new Date(t.date),
  }))

  console.log(`📊 Analyzing ${transactions.length} transactions...\n`)

  // Find vendor variants
  const variants = findVendorVariants(transactions)

  console.log(`Found ${variants.length} vendor groups with multiple variants:\n`)

  // Show top 20 groups
  const topGroups = variants.slice(0, 20)
  for (let i = 0; i < topGroups.length; i++) {
    const group = topGroups[i]
    console.log(`${i + 1}. ${group.normalizedName.toUpperCase()}`)
    console.log(`   Variants (${group.variants.length}):`)
    for (const variant of group.variants) {
      const count = transactions.filter((t) => t.vendor === variant).length
      console.log(`     - "${variant}" (${count} transactions)`)
    }
    console.log(`   Total transactions: ${group.transactionCount}\n`)
  }

  if (variants.length > 20) {
    console.log(`... and ${variants.length - 20} more groups\n`)
  }

  // Test auto-merge
  console.log("=".repeat(80))
  console.log("🔄 Testing Auto-Merge\n")

  const { transactions: mergedTransactions, mergedGroups } = autoMergeVendors(
    transactions,
    2
  )

  console.log(`Merged ${mergedGroups.length} vendor groups:\n`)

  for (const group of mergedGroups.slice(0, 20)) {
    console.log(`✓ ${group.canonical}`)
    console.log(`  Merged from: ${group.variants.join(", ")}\n`)
  }

  if (mergedGroups.length > 20) {
    console.log(`... and ${mergedGroups.length - 20} more merged groups\n`)
  }

  // Show statistics
  const originalVendorCount = new Set(transactions.map((t) => t.vendor)).size
  const mergedVendorCount = new Set(
    mergedTransactions.map((t) => t.vendor)
  ).size

  console.log("=".repeat(80))
  console.log("📈 Statistics\n")
  console.log(`Original unique vendors: ${originalVendorCount}`)
  console.log(`After merging: ${mergedVendorCount}`)
  console.log(`Reduction: ${originalVendorCount - mergedVendorCount} vendors (${((originalVendorCount - mergedVendorCount) / originalVendorCount * 100).toFixed(1)}%)\n`)

  // Save results
  const outputPath = path.join(__dirname, "../data/vendor-variants.json")
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        scanDate: new Date().toISOString(),
        totalTransactions: transactions.length,
        originalVendorCount,
        mergedVendorCount,
        variants: variants.map((v) => ({
          normalizedName: v.normalizedName,
          variants: v.variants,
          transactionCount: v.transactionCount,
        })),
        mergedGroups: mergedGroups.map((g) => ({
          canonical: g.canonical,
          variants: g.variants,
        })),
      },
      null,
      2
    )
  )

  console.log(`💾 Results saved to: ${outputPath}\n`)

  // Show some examples of normalization
  console.log("=".repeat(80))
  console.log("🔤 Normalization Examples\n")

  const examples = [
    "Tom Sushi #50929 BC",
    "Tom Sushi #50788 BC",
    "SHOPPERS DRUG MART #222 VANCOUVER",
    "SHOPPERS DRUG MART #227 VANCOUVER",
    "CANCO PETROLEUM #102 CA GRAND FORKS",
    "CANCO PETROLEUM #204 N NEW DENVER",
    "HUNTER GATHER #1 WHISTLER",
    "SAFEWAY #4948 NELSON",
  ]

  for (const example of examples) {
    const normalized = normalizeVendorForGrouping(example)
    console.log(`"${example}" → "${normalized}"`)
  }
}

// Run the script
detectVendorVariants().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

