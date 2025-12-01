import { DollarSign, TrendingUp, RefreshCw, CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Transaction } from "@/lib/types"

interface SummaryCardsProps {
  transactions: Transaction[]
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  // Only count debit transactions (spending), exclude credits (payments received)
  const debitTransactions = transactions.filter((t) => t.type === "debit")
  const totalSpent = debitTransactions.reduce((sum, t) => sum + t.amount, 0)
  const subscriptionTotal = debitTransactions.filter((t) => t.isSubscription).reduce((sum, t) => sum + t.amount, 0)

  // Calculate average monthly spending (only from debits)
  const months = new Set(debitTransactions.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`))
  const avgMonthly = totalSpent / Math.max(months.size, 1)

  const transactionCount = debitTransactions.length

  const cards = [
    {
      title: "Total Spent",
      value: `$${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "All time",
    },
    {
      title: "Avg Monthly",
      value: `$${avgMonthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      description: `Across ${months.size} months`,
    },
    {
      title: "Subscriptions",
      value: `$${subscriptionTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: RefreshCw,
      description: "Recurring charges",
    },
    {
      title: "Transactions",
      value: transactionCount.toLocaleString(),
      icon: CreditCard,
      description: "Total count",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{card.title}</span>
              <card.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
