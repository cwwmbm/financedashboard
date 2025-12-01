import type { Transaction } from "./types"

const STORAGE_KEY = "financial-dashboard-transactions"

/**
 * Save transactions to localStorage
 */
export function saveTransactions(transactions: Transaction[]): void {
  if (typeof window === "undefined") return // SSR safety

  try {
    const data = JSON.stringify(
      transactions.map((t) => ({
        ...t,
        date: t.date.toISOString(), // Convert Date to string for storage
      })),
    )
    localStorage.setItem(STORAGE_KEY, data)
  } catch (error) {
    console.error("Failed to save transactions to localStorage:", error)
  }
}

/**
 * Load transactions from localStorage
 */
export function loadTransactions(): Transaction[] | null {
  if (typeof window === "undefined") return null // SSR safety

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data)
    // Convert date strings back to Date objects
    return parsed.map((t: any) => ({
      ...t,
      date: new Date(t.date),
    })) as Transaction[]
  } catch (error) {
    console.error("Failed to load transactions from localStorage:", error)
    return null
  }
}

/**
 * Clear stored transactions
 */
export function clearTransactions(): void {
  if (typeof window === "undefined") return // SSR safety

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear transactions from localStorage:", error)
  }
}

