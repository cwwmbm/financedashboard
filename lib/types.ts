export interface Transaction {
  id: string
  date: Date
  description: string
  amount: number
  vendor: string
  category: string
  isSubscription: boolean
  type: "debit" | "credit" // debit = spending, credit = payment received
}

export interface ParsedData {
  transactions: Transaction[]
}

export interface MonthlyData {
  month: string
  total: number
  subscriptions: number
  other: number
}

export interface VendorData {
  name: string
  total: number
  count: number
}

export interface SubscriptionData {
  name: string
  amount: number
  frequency: string
  lastCharge: Date
}
