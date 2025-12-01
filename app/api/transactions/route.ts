import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import type { Transaction } from "@/lib/types"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "transactions.json")

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// GET - Load transactions from file
export async function GET() {
  try {
    ensureDataDir()

    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json({ transactions: [], fileExists: false })
    }

    const fileContent = fs.readFileSync(DATA_FILE, "utf-8")
    const data = JSON.parse(fileContent)

    // Ensure we have a valid transactions array
    if (!data.transactions || !Array.isArray(data.transactions)) {
      return NextResponse.json({ transactions: [], fileExists: true })
    }

    // Convert date strings back to Date objects
    const transactions: Transaction[] = data.transactions
      .map((t: any) => {
        try {
          return {
            ...t,
            date: new Date(t.date),
            // Default to "debit" for old transactions that don't have type field
            type: t.type || "debit",
          }
        } catch (e) {
          console.error("Error parsing transaction date:", t)
          return null
        }
      })
      .filter((t: Transaction | null) => t !== null) as Transaction[]

    return NextResponse.json({ transactions, fileExists: true })
  } catch (error) {
    console.error("Error loading transactions:", error)
    return NextResponse.json({ error: "Failed to load transactions", transactions: [] }, { status: 500 })
  }
}

// POST - Save transactions to file
export async function POST(request: NextRequest) {
  try {
    ensureDataDir()

    const body = await request.json()
    const { transactions } = body

    if (!Array.isArray(transactions)) {
      return NextResponse.json({ error: "Invalid transactions data" }, { status: 400 })
    }

    // Convert Date objects to ISO strings for storage
    // Note: dates come as strings from JSON, so we need to handle both cases
    const dataToSave = {
      transactions: transactions.map((t: Transaction) => {
        let dateStr: string
        if (t.date instanceof Date) {
          dateStr = t.date.toISOString()
        } else if (typeof t.date === "string") {
          // Already a string, validate it's a valid date
          dateStr = new Date(t.date).toISOString()
        } else {
          // Fallback: try to parse whatever it is
          dateStr = new Date(t.date as any).toISOString()
        }
        return {
          ...t,
          date: dateStr,
        }
      }),
      lastUpdated: new Date().toISOString(),
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving transactions:", error)
    return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 })
  }
}

