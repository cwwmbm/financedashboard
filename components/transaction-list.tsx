"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { Transaction } from "@/lib/types"

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("All")

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category))
    return ["All", ...Array.from(cats).sort()]
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch =
          t.vendor.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = categoryFilter === "All" || t.category === categoryFilter
        return matchesSearch && matchesCategory
      })
      .slice(0, 50)
  }, [transactions, search, categoryFilter])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                {categoryFilter}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {categories.map((cat) => (
                <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t.vendor}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {t.category}
                  </span>
                  {t.isSubscription && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">Sub</span>
                  )}
                </div>
              </div>
              <span
                className={`font-mono font-medium ml-4 ${
                  t.type === "credit" ? "text-green-500" : "text-destructive"
                }`}
              >
                {t.type === "credit" ? "+" : "-"}${t.amount.toFixed(2)}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
