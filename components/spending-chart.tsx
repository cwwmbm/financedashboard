"use client"

import { useMemo, useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EditableTransactionList } from "@/components/editable-transaction-list"
import type { Transaction } from "@/lib/types"

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

interface SpendingChartProps {
  transactions: Transaction[]
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}

export function SpendingChart({ transactions, onUpdateTransactions }: SpendingChartProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  // Load categories on mount
  useEffect(() => {
    loadCategories().then(setCategories)
  }, [])

  const monthlyData = useMemo(() => {
    const grouped = new Map<string, { total: number; subscriptions: number }>()

    // Only count debit transactions (spending), exclude credits (payments received)
    let debitTransactions = transactions.filter((t) => t.type === "debit")

    // Filter by category if a specific category is selected
    if (selectedCategory !== "All") {
      debitTransactions = debitTransactions.filter((t) => t.category === selectedCategory)
    }

    for (const t of debitTransactions) {
      // Ensure date is a Date object
      const date = t.date instanceof Date ? t.date : new Date(t.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const existing = grouped.get(key) || { total: 0, subscriptions: 0 }
      existing.total += t.amount
      if (t.isSubscription) {
        existing.subscriptions += t.amount
      }
      grouped.set(key, existing)
    }

    // Sort chronologically and take only the last 12 months
    const sortedMonths = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Take last 12 months

    return sortedMonths.map(([month, data]) => {
      // Parse month string (e.g., "2025-11") and create date in local timezone
      const [year, monthNum] = month.split("-").map(Number)
      const date = new Date(year, monthNum - 1, 1) // monthNum - 1 because Date months are 0-indexed
      
      return {
        month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        total: Math.round(data.total * 100) / 100,
      }
    })
  }, [transactions, selectedCategory])

  // Get all unique categories from transactions for the dropdown
  const allCategories = useMemo(() => {
    const uniqueCategories = new Set(transactions.map((t) => t.category).filter(Boolean))
    return Array.from(uniqueCategories).sort()
  }, [transactions])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Monthly Spending Trend</CardTitle>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                  <stop offset="50%" stopColor="#16a34a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#15803d" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #333",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                cursor={{ fill: "rgba(34, 197, 94, 0.15)" }}
              />
              <Bar 
                dataKey="total" 
                fill="url(#barGradient)" 
                radius={[4, 4, 0, 0]}
                onClick={(data) => {
                  if (data && data.month) {
                    setSelectedMonth(data.month)
                    setIsDialogOpen(true)
                  }
                }}
                style={{ cursor: "pointer" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedMonth ? `Transactions for ${selectedMonth}` : "Transactions"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            {selectedMonth && (
              <MonthTransactions 
                transactions={transactions} 
                monthLabel={selectedMonth}
                monthlyData={monthlyData}
                onUpdateTransactions={onUpdateTransactions}
                selectedCategory={selectedCategory}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function MonthTransactions({ 
  transactions, 
  monthLabel,
  monthlyData,
  onUpdateTransactions,
  selectedCategory
}: { 
  transactions: Transaction[]
  monthLabel: string
  monthlyData: Array<{ month: string; total: number }>
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
  selectedCategory: string
}) {
  // Find the month key from the label (e.g., "Nov 25" -> "2025-11")
  const monthData = monthlyData.find((m) => m.month === monthLabel)
  if (!monthData) return <p className="text-sm text-muted-foreground">No data found</p>

  // Parse the month label (e.g., "Nov 25" -> year: 2025, month: 10 (0-indexed))
  // Handle 2-digit year: assume 20xx for years 00-99
  const parts = monthLabel.split(" ")
  const monthName = parts[0]
  const yearStr = parts[1] || "25"
  const year = parseInt(yearStr) < 50 ? 2000 + parseInt(yearStr) : 1900 + parseInt(yearStr)
  
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  }
  const month = monthNames[monthName.toLowerCase()] ?? 0

  // Filter transactions for this month (debit only)
  let monthTransactions = transactions
    .filter((t) => {
      const date = t.date instanceof Date ? t.date : new Date(t.date)
      return (
        t.type === "debit" &&
        date.getFullYear() === year &&
        date.getMonth() === month
      )
    })

  // Filter by category if a specific category is selected
  if (selectedCategory !== "All") {
    monthTransactions = monthTransactions.filter((t) => t.category === selectedCategory)
  }

  monthTransactions = monthTransactions.sort((a, b) => b.amount - a.amount) // Sort by amount descending

  return (
    <EditableTransactionList 
      transactions={monthTransactions}
      allTransactions={transactions}
      onUpdateTransactions={onUpdateTransactions}
    />
  )
}
