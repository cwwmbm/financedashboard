"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { FileUpload } from "@/components/file-upload"
import { SpendingChart } from "@/components/spending-chart"
import { CategoryChart } from "@/components/category-chart"
import { TopVendors } from "@/components/top-vendors"
import { SubscriptionsPanel } from "@/components/subscriptions-panel"
import { SummaryCards } from "@/components/summary-cards"
import { generateSampleData } from "@/lib/sample-data"
import type { Transaction, ParsedData } from "@/lib/types"

// Save transactions to JSON file via API
async function saveTransactions(transactions: Transaction[]) {
  try {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transactions }),
    })
    const result = await response.json()
    if (!response.ok) {
      console.error("Failed to save transactions:", result.error)
    } else {
      console.log(`Successfully saved ${transactions.length} transactions`)
    }
  } catch (error) {
    console.error("Failed to save transactions:", error)
  }
}

// Load transactions from JSON file via API
async function loadTransactions(): Promise<{ transactions: Transaction[]; fileExists: boolean }> {
  try {
    const response = await fetch("/api/transactions")
    if (!response.ok) {
      console.error("Failed to load transactions: HTTP", response.status)
      return { transactions: [], fileExists: false }
    }
    const data = await response.json()
    // Return the transactions from file and whether file exists
    const transactionsRaw = data.transactions || []
    const fileExists = data.fileExists !== undefined ? data.fileExists : true
    
    // Convert date strings back to Date objects (JSON serialization converts dates to strings)
    const transactions: Transaction[] = transactionsRaw.map((t: any) => ({
      ...t,
      date: t.date instanceof Date ? t.date : new Date(t.date),
    }))
    
    console.log(`Loaded ${transactions.length} transactions (file exists: ${fileExists})`)
    return {
      transactions,
      fileExists,
    }
  } catch (error) {
    console.error("Failed to load transactions:", error)
    return { transactions: [], fileExists: false }
  }
}

export default function Dashboard() {
  // Start with empty array, will load from file on mount
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load transactions from file on mount
  useEffect(() => {
    loadTransactions().then(({ transactions: loaded }) => {
      // Only load data from file - never show sample data automatically
      // Sample data is only shown when user explicitly clicks "Load Sample Data" button
      setTransactions(loaded)
      setIsLoadingData(false)
    })
  }, [])

  const handleDataParsed = (data: ParsedData) => {
    // Replace all transactions with the new CSV data
    setTransactions(data.transactions)
    setShowUpload(false)
    // Save to file when new CSV data is loaded (this replaces the file completely)
    saveTransactions(data.transactions)
  }

  const handleToggleSubscription = (transactionId: string, isSubscription: boolean) => {
    const updated = transactions.map((t) => (t.id === transactionId ? { ...t, isSubscription } : t))
    setTransactions(updated)
    // Save to file when subscription status changes
    saveTransactions(updated)
  }

  const handleUpdateTransactions = (updatedTransactions: Transaction[]) => {
    setTransactions(updatedTransactions)
    // Save to file when transactions are updated
    saveTransactions(updatedTransactions)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {showUpload ? (
          <div className="space-y-4">
            <FileUpload onDataParsed={handleDataParsed} isLoading={isLoading} setIsLoading={setIsLoading} />
            <div className="flex justify-center">
              <button
                onClick={() => setShowUpload(false)}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <SummaryCards transactions={transactions} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SpendingChart transactions={transactions} onUpdateTransactions={handleUpdateTransactions} />
              </div>
              <div>
                <CategoryChart transactions={transactions} onUpdateTransactions={handleUpdateTransactions} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SubscriptionsPanel 
                transactions={transactions} 
                onToggleSubscription={handleToggleSubscription}
                onUpdateTransactions={handleUpdateTransactions}
              />
              <div className="lg:col-span-2">
                <TopVendors transactions={transactions} onUpdateTransactions={handleUpdateTransactions} />
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setShowUpload(true)}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Upload your own statements
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
