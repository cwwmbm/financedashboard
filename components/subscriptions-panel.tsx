"use client"

import { useMemo, useState } from "react"
import { RefreshCw, Calendar, Plus, X, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EditableTransactionList } from "@/components/editable-transaction-list"
import type { Transaction } from "@/lib/types"

interface SubscriptionsPanelProps {
  transactions: Transaction[]
  onToggleSubscription?: (transactionId: string, isSubscription: boolean) => void
  onUpdateTransactions?: (updatedTransactions: Transaction[]) => void
}

export function SubscriptionsPanel({ transactions, onToggleSubscription, onUpdateTransactions }: SubscriptionsPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isTransactionsDialogOpen, setIsTransactionsDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<{ name: string; transactionIds: string[] } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const subscriptions = useMemo(() => {
    // Only count debit transactions (spending), exclude credits (payments received)
    const debitTransactions = transactions.filter((t) => t.type === "debit")
    const subTransactions = debitTransactions.filter((t) => t.isSubscription)
    const grouped = new Map<string, { amounts: number[]; lastCharge: Date; transactionIds: string[] }>()

    for (const t of subTransactions) {
      const existing = grouped.get(t.vendor) || { amounts: [], lastCharge: t.date, transactionIds: [] }
      existing.amounts.push(t.amount)
      existing.transactionIds.push(t.id)
      if (t.date > existing.lastCharge) {
        existing.lastCharge = t.date
      }
      grouped.set(t.vendor, existing)
    }

    return Array.from(grouped.entries())
      .map(([name, data]) => {
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
        // Get frequency from the first transaction (all transactions from same vendor should have same frequency)
        const firstTransaction = transactions.find((t) => data.transactionIds.includes(t.id))
        const frequency = firstTransaction?.subscriptionFrequency 
          ? firstTransaction.subscriptionFrequency === "monthly" ? "Monthly" : "Annual"
          : data.amounts.length > 1 ? "Monthly" : "One-time"
        
        return {
          name,
          amount: Math.round(avgAmount * 100) / 100,
          frequency,
          lastCharge: data.lastCharge,
          chargeCount: data.amounts.length,
          transactionIds: data.transactionIds,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])

  const nonSubscriptionTransactions = useMemo(() => {
    // Only show debit transactions (spending), exclude credits (payments received)
    const debitTransactions = transactions.filter((t) => t.type === "debit")
    const nonSubs = debitTransactions.filter((t) => !t.isSubscription)
    // Group by vendor to show unique vendors
    const grouped = new Map<string, Transaction[]>()
    for (const t of nonSubs) {
      const existing = grouped.get(t.vendor) || []
      existing.push(t)
      grouped.set(t.vendor, existing)
    }
    return Array.from(grouped.entries())
      .map(([vendor, txns]) => ({
        vendor,
        transactions: txns,
        totalAmount: txns.reduce((sum, t) => sum + t.amount, 0),
        count: txns.length,
        latestTransaction: txns.sort((a, b) => b.date.getTime() - a.date.getTime())[0],
      }))
      .sort((a, b) => b.count - a.count)
  }, [transactions])

  const filteredVendors = nonSubscriptionTransactions.filter((v) =>
    v.vendor.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const monthlyTotal = subscriptions.filter((s) => s.frequency === "Monthly").reduce((sum, s) => sum + s.amount, 0)

  const handleRemoveSubscription = (transactionIds: string[]) => {
    if (onUpdateTransactions) {
      // Remove all transactions with these IDs from the dataset
      const updated = transactions.filter((t) => !transactionIds.includes(t.id))
      onUpdateTransactions(updated)
    }
  }

  const handleAddSubscription = (vendorTransactions: Transaction[]) => {
    if (onToggleSubscription) {
      vendorTransactions.forEach((t) => onToggleSubscription(t.id, true))
    }
    setIsAddDialogOpen(false)
    setSearchQuery("")
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Subscriptions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              ${monthlyTotal.toFixed(2)}/mo
            </Badge>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 bg-transparent">
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Subscription</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {filteredVendors.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <div
                          key={vendor.vendor}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                          onClick={() => handleAddSubscription(vendor.transactions)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{vendor.vendor}</p>
                            <p className="text-xs text-muted-foreground">
                              {vendor.count} transaction{vendor.count > 1 ? "s" : ""} · $
                              {(vendor.totalAmount / vendor.count).toFixed(2)} avg
                            </p>
                          </div>
                          <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No subscriptions detected</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {subscriptions.map((sub) => (
              <div 
                key={sub.name} 
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 group cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => {
                  setSelectedSubscription({ name: sub.name, transactionIds: sub.transactionIds })
                  setIsTransactionsDialogOpen(true)
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{sub.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {sub.frequency} · {sub.chargeCount} charges
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-primary">${sub.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.lastCharge.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveSubscription(sub.transactionIds)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
                    title="Delete all transactions for this vendor"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isTransactionsDialogOpen} onOpenChange={setIsTransactionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedSubscription ? `Transactions for ${selectedSubscription.name}` : "Transactions"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            {selectedSubscription && onUpdateTransactions && (
              <SubscriptionTransactions 
                transactions={transactions}
                transactionIds={selectedSubscription.transactionIds}
                subscriptionName={selectedSubscription.name}
                onUpdateTransactions={onUpdateTransactions}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SubscriptionTransactions({
  transactions,
  transactionIds,
  subscriptionName,
  onUpdateTransactions,
}: {
  transactions: Transaction[]
  transactionIds: string[]
  subscriptionName: string
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}) {
  // Filter transactions for this subscription
  const subscriptionTransactions = transactions
    .filter((t) => transactionIds.includes(t.id))
    .sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date)
      const dateB = b.date instanceof Date ? b.date : new Date(b.date)
      return dateB.getTime() - dateA.getTime() // Sort by date descending
    })

  return (
    <EditableTransactionList 
      transactions={subscriptionTransactions}
      allTransactions={transactions}
      onUpdateTransactions={onUpdateTransactions}
    />
  )
}
