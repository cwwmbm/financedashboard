"use client"

import { useMemo, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, LabelList } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EditableTransactionList } from "@/components/editable-transaction-list"
import { CategoryManager } from "@/components/category-manager"
import { Settings2 } from "lucide-react"
import type { Transaction } from "@/lib/types"

interface CategoryChartProps {
  transactions: Transaction[]
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
]

export function CategoryChart({ transactions, onUpdateTransactions }: CategoryChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<{ name: string; value: number; percent: number } | null>(null)

  const categoryData = useMemo(() => {
    const grouped = new Map<string, number>()

    // Only count debit transactions (spending), exclude credits (payments received)
    const debitTransactions = transactions.filter((t) => t.type === "debit")

    for (const t of debitTransactions) {
      const existing = grouped.get(t.category) || 0
      grouped.set(t.category, existing + t.amount)
    }

    const total = Array.from(grouped.values()).reduce((sum, val) => sum + val, 0)
    
    return Array.from(grouped.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percent: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const handlePieClick = (data: any, index: number) => {
    if (data && categoryData[index]) {
      setSelectedCategory(categoryData[index].name)
      setIsDialogOpen(true)
    }
  }

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Legend in top right corner of the card */}
          {hoveredCategory && (
            <div className="absolute top-4 right-4 z-0 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg min-w-[200px] pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: COLORS[categoryData.findIndex((c) => c.name === hoveredCategory.name) % COLORS.length],
                  }}
                />
                <span className="font-medium text-sm">{hoveredCategory.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                ${hoveredCategory.value.toFixed(2)} ({hoveredCategory.percent.toFixed(1)}%)
              </div>
            </div>
          )}
          
          {/* Color legend in bottom right corner */}
          <div className="absolute bottom-4 right-4 z-20 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg max-w-[200px] max-h-[200px] overflow-y-auto">
            <div className="space-y-1.5 text-xs pointer-events-none">
              {categoryData.map((category, index) => (
                <div key={category.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                  <span className="truncate">{category.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border pointer-events-auto">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => setIsCategoryManagerOpen(true)}
              >
                <Settings2 className="h-3 w-3 mr-1" />
                Edit list
              </Button>
            </div>
          </div>

          <div className="h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="30%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data: any, index: number) => {
                    console.log("Pie onClick triggered - data:", data, "index:", index)
                    const categoryName = data?.name || categoryData[index]?.name
                    console.log("Category name to open:", categoryName)
                    if (categoryName) {
                      setSelectedCategory(categoryName)
                      setIsDialogOpen(true)
                    }
                  }}
                  onMouseDown={(data: any, index: number) => {
                    console.log("Pie onMouseDown triggered - data:", data, "index:", index)
                    const categoryName = data?.name || categoryData[index]?.name
                    if (categoryName) {
                      setSelectedCategory(categoryName)
                      setIsDialogOpen(true)
                    }
                  }}
                  onMouseEnter={(entry: any, index: number) => {
                    const category = categoryData[index]
                    if (category) {
                      setHoveredCategory({
                        name: category.name,
                        value: category.value,
                        percent: category.percent,
                      })
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredCategory(null)
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? `Transactions in ${selectedCategory}` : "Transactions"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            {selectedCategory && (
              <CategoryTransactions 
                transactions={transactions} 
                category={selectedCategory}
                onUpdateTransactions={onUpdateTransactions}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CategoryManager
        open={isCategoryManagerOpen}
        onOpenChange={setIsCategoryManagerOpen}
        transactions={transactions}
        onUpdateTransactions={onUpdateTransactions}
      />
    </>
  )
}

function CategoryTransactions({
  transactions,
  category,
  onUpdateTransactions,
}: {
  transactions: Transaction[]
  category: string
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}) {
  // Filter transactions for this category (debit only)
  const categoryTransactions = transactions
    .filter((t) => t.type === "debit" && t.category === category)
    .sort((a, b) => b.amount - a.amount) // Sort by amount descending

  return (
    <EditableTransactionList 
      transactions={categoryTransactions}
      allTransactions={transactions}
      onUpdateTransactions={onUpdateTransactions}
    />
  )
}

