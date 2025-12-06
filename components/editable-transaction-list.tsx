"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Transaction } from "@/lib/types"

interface EditableTransactionListProps {
  transactions: Transaction[]
  allTransactions: Transaction[]
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}

export function EditableTransactionList({
  transactions,
  allTransactions,
  onUpdateTransactions,
}: EditableTransactionListProps) {
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories")
        const data = await response.json()
        setAllCategories(data.categories || [])
      } catch (error) {
        console.error("Error loading categories:", error)
      }
    }
    loadCategories()
  }, [])

  // Handle category change
  async function handleCategoryChange(transaction: Transaction, newCategory: string) {
    // Update all transactions from the same vendor
    const updated = allTransactions.map((t) => {
      if (t.vendor === transaction.vendor) {
        return { ...t, category: newCategory }
      }
      return t
    })

    // Save vendor-category mapping
    try {
      await fetch("/api/vendor-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: transaction.vendor,
          category: newCategory,
        }),
      })
    } catch (error) {
      console.error("Error saving vendor-category mapping:", error)
    }

    onUpdateTransactions(updated)
  }

  // Handle subscription toggle
  async function handleSubscriptionChange(
    transaction: Transaction,
    isSubscription: boolean,
    frequency?: "monthly" | "annual",
  ) {
    const updated = allTransactions.map((t) => {
      if (t.id === transaction.id) {
        return {
          ...t,
          isSubscription,
          subscriptionFrequency: isSubscription ? frequency : undefined,
        }
      }
      return t
    })

    onUpdateTransactions(updated)
  }

  // Handle transaction deletion
  function handleDelete(transactionId: string) {
    const updated = allTransactions.filter((t) => t.id !== transactionId)
    onUpdateTransactions(updated)
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No transactions found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {transactions.map((transaction) => {
        const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
        const isDebit = transaction.type === "debit"
        const amountDisplay = isDebit ? `-$${transaction.amount.toFixed(2)}` : `+$${transaction.amount.toFixed(2)}`

        return (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
            onMouseEnter={() => setHoveredId(transaction.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{transaction.vendor}</p>
                <Select
                  value={transaction.category}
                  onValueChange={(value) => handleCategoryChange(transaction, value)}
                >
                  <SelectTrigger className="h-6 px-2 text-xs">
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
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className={`text-xs font-mono ${isDebit ? "text-red-400" : "text-green-400"}`}>
                  {amountDisplay}
                </p>
                {transaction.isSubscription ? (
                  <Select
                    value={transaction.subscriptionFrequency || "monthly"}
                    onValueChange={(value) => {
                      if (value === "remove") {
                        handleSubscriptionChange(transaction, false)
                      } else {
                        handleSubscriptionChange(transaction, true, value as "monthly" | "annual")
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 px-2 text-xs">
                      <SelectValue>
                        {transaction.subscriptionFrequency === "annual" ? "Annual Sub" : "Monthly Sub"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Sub</SelectItem>
                      <SelectItem value="annual">Annual Sub</SelectItem>
                      <SelectItem value="remove">Remove Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    onValueChange={(value) =>
                      handleSubscriptionChange(transaction, true, value as "monthly" | "annual")
                    }
                  >
                    <SelectTrigger className="h-6 px-2 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      <span>Sub</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {transaction.isSubscription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubscriptionChange(transaction, false)
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            {hoveredId === transaction.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(transaction.id)
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

