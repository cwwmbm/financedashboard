# Vendor Merging Guide

This document explains how to use the vendor merging functionality to detect and merge similar vendors (e.g., "Tom Sushi #50929 BC" and "Tom Sushi #50788 BC").

## Functions Available

### 1. `normalizeVendorForGrouping(vendor: string): string`
Normalizes a vendor name by removing:
- Store numbers (#123, #1234, etc.)
- Location codes (BC, CA, ON, etc.)
- Single-letter location indicators (N, S, E, W)

**Example:**
```typescript
normalizeVendorForGrouping("Tom Sushi #50929 BC") // Returns: "tom sushi"
normalizeVendorForGrouping("Tom Sushi #50788 BC") // Returns: "tom sushi"
```

### 2. `findVendorVariants(transactions: Transaction[])`
Finds all vendor groups that have multiple variants (same vendor, different store numbers/locations).

**Returns:** Array of groups with:
- `normalizedName`: The normalized vendor name
- `variants`: Array of all variant names found
- `transactionCount`: Total number of transactions for this vendor

### 3. `autoMergeVendors(transactions: Transaction[], minVariants?: number)`
Automatically merges vendor variants into a canonical name.

**Parameters:**
- `transactions`: Array of transactions to process
- `minVariants`: Minimum number of variants required to merge (default: 2)

**Returns:**
- `transactions`: Updated transactions with merged vendor names
- `mergedGroups`: Array of groups that were merged

**Example:**
```typescript
const { transactions, mergedGroups } = autoMergeVendors(transactions, 2)

// All "Tom Sushi #50929 BC", "Tom Sushi #50788 BC", etc. 
// will be merged to a single canonical name (most common variant)
```

### 4. `mergeVendorNames(transactions: Transaction[], vendorMapping: Map<string, string>)`
Manually merge vendors using a custom mapping.

**Example:**
```typescript
const mapping = new Map([
  ["Tom Sushi #50929 BC", "Tom Sushi"],
  ["Tom Sushi #50788 BC", "Tom Sushi"],
])
const merged = mergeVendorNames(transactions, mapping)
```

## Usage Examples

### Detect Vendor Variants

Run the detection script:
```bash
npx tsx scripts/detect-vendor-variants.ts
```

This will:
1. Analyze all transactions
2. Find vendor groups with multiple variants
3. Show statistics
4. Save results to `data/vendor-variants.json`

### Auto-Merge Vendors in Your Code

```typescript
import { autoMergeVendors } from "./lib/csv-parser"
import type { Transaction } from "./lib/types"

// Load your transactions
const transactions: Transaction[] = [...]

// Auto-merge vendors (requires at least 2 variants)
const { transactions: mergedTransactions, mergedGroups } = autoMergeVendors(
  transactions,
  2 // minimum variants required
)

console.log(`Merged ${mergedGroups.length} vendor groups`)
console.log(`Reduced from ${transactions.length} to ${mergedTransactions.length} unique vendors`)
```

### Manual Review and Merge

If you want to review variants before merging:

```typescript
import { findVendorVariants } from "./lib/csv-parser"

const variants = findVendorVariants(transactions)

// Review variants
for (const group of variants) {
  console.log(`${group.normalizedName}:`)
  console.log(`  Variants: ${group.variants.join(", ")}`)
  console.log(`  Transactions: ${group.transactionCount}`)
}

// Then manually create a mapping and merge
const mapping = new Map()
mapping.set("Tom Sushi #50929 BC", "Tom Sushi")
mapping.set("Tom Sushi #50788 BC", "Tom Sushi")
// ... etc

const merged = mergeVendorNames(transactions, mapping)
```

## Integration with CSV Parser

The `extractVendor` function has been updated to automatically remove store numbers during initial parsing. This means:

1. **New CSV uploads** will automatically have store numbers removed
2. **Existing transactions** can use the merging functions to normalize vendor names

## Notes

- Store numbers are removed using pattern: `#` followed by 1-6 digits
- Location codes (BC, CA, ON, etc.) are removed
- The canonical name is chosen as the most common variant, or shortest if tied
- Merging preserves all transaction data, only updates the `vendor` field

