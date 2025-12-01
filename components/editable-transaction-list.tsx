"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { Transaction } from "@/lib/types"

interface EditableTransactionListProps {
  transactions: Transaction[]
  allTransactions: Transaction[] // Full transaction list to update all vendor transactions
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}

const DEFAULT_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Entertainment",
  "Utilities",
  "Health",
  "Travel",
  "Other",
]

// Load categories from API
async function loadCategories(): Promise<string[]> {
  try {
    const response = await fetch("/api/categories")
    if (!response.ok) {
      return DEFAULT_CATEGORIES
    }
    const data = await response.json()
    return data.categories || DEFAULT_CATEGORIES
  } catch (error) {
    console.error("Failed to load categories:", error)
    return DEFAULT_CATEGORIES
  }
}

export function EditableTransactionList({ transactions, allTransactions, onUpdateTransactions }: EditableTransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  // Load categories on mount and when transactions change (in case categories were updated)
  useEffect(() => {
    loadCategories().then(setCategories)
  }, [allTransactions.length]) // Reload when transaction count changes (indicates updates)

  // Get all unique categories from saved categories and existing transactions
  const allCategories = Array.from(
    new Set([
      ...categories,
      ...allTransactions.map((t) => t.category).filter(Boolean),
    ])
  ).sort()

  const handleCategoryChange = (transactionId: string, newCategory: string) => {
    // Find the transaction being edited
    const editedTransaction = transactions.find((t) => t.id === transactionId)
    if (!editedTransaction) return

    // Get the vendor from the edited transaction
    const vendor = editedTransaction.vendor

    // Update ALL transactions from the same vendor in the full transaction list
    const updated = allTransactions.map((t) => {
      if (t.vendor === vendor) {
        return { ...t, category: newCategory }
      }
      return t
    })

    onUpdateTransactions(updated)
    setEditingId(null)
  }

  const handleDeleteTransaction = (transactionId: string) => {
    // Remove the transaction from the full transaction list
    const updated = allTransactions.filter((t) => t.id !== transactionId)
    onUpdateTransactions(updated)
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions found</p>
  }

  const total = transactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
        <span className="text-sm text-muted-foreground">
          {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-medium">Total: ${total.toFixed(2)}</span>
      </div>
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{t.vendor}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {t.date instanceof Date
                  ? t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              {editingId === t.id ? (
                <Select
                  value={t.category}
                  onValueChange={(value) => handleCategoryChange(t.id, value)}
                  onOpenChange={(open) => {
                    if (!open) {
                      setEditingId(null)
                    }
                  }}
                >
                  <SelectTrigger className="h-6 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span
                  className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => setEditingId(t.id)}
                  title="Click to edit category"
                >
                  {t.category}
                </span>
              )}
              {t.isSubscription && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  Sub
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="font-mono font-medium text-destructive">
              ${t.amount.toFixed(2)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDeleteTransaction(t.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete transaction"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

