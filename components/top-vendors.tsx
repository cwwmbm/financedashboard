"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditableTransactionList } from "@/components/editable-transaction-list"
import type { Transaction } from "@/lib/types"

interface TopVendorsProps {
  transactions: Transaction[]
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}

export function TopVendors({ transactions, onUpdateTransactions }: TopVendorsProps) {
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const vendorData = useMemo(() => {
    const grouped = new Map<string, { total: number; count: number }>()

    // Only count debit transactions (spending), exclude credits (payments received)
    const debitTransactions = transactions.filter((t) => t.type === "debit")

    for (const t of debitTransactions) {
      const existing = grouped.get(t.vendor) || { total: 0, count: 0 }
      existing.total += t.amount
      existing.count += 1
      grouped.set(t.vendor, existing)
    }

    return Array.from(grouped.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
    // Removed .slice(0, 8) to show all vendors
  }, [transactions])

  const maxTotal = Math.max(...vendorData.map((v) => v.total), 1)

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Top Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {vendorData.map((vendor, index) => (
              <div
                key={vendor.name}
                className="space-y-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setSelectedVendor(vendor.name)
                  setIsDialogOpen(true)
                }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{index + 1}.</span>
                    <span className="truncate max-w-[140px]">{vendor.name}</span>
                  </span>
                  <span className="font-medium">
                    ${vendor.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(vendor.total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedVendor ? `Transactions for ${selectedVendor}` : "Transactions"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            {selectedVendor && (
              <VendorTransactions 
                transactions={transactions} 
                vendor={selectedVendor}
                onUpdateTransactions={onUpdateTransactions}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function VendorTransactions({ 
  transactions, 
  vendor,
  onUpdateTransactions
}: { 
  transactions: Transaction[]
  vendor: string
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}) {
  // Filter transactions for this vendor (debit only)
  const vendorTransactions = transactions
    .filter((t) => t.type === "debit" && t.vendor === vendor)
    .sort((a, b) => b.amount - a.amount) // Sort by amount descending

  return (
    <EditableTransactionList 
      transactions={vendorTransactions}
      allTransactions={transactions}
      onUpdateTransactions={onUpdateTransactions}
    />
  )
}
