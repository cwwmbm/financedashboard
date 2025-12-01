import type { Transaction } from "./types"

// Generate realistic sample transactions over 6 months
export function generateSampleData(): Transaction[] {
  const transactions: Transaction[] = []
  const now = new Date()

  // Recurring subscriptions
  const subscriptions = [
    { vendor: "Netflix", amount: 15.99, category: "Entertainment" },
    { vendor: "Spotify", amount: 9.99, category: "Entertainment" },
    { vendor: "Adobe Creative Cloud", amount: 54.99, category: "Software" },
    { vendor: "Gym Membership", amount: 49.99, category: "Health" },
    { vendor: "iCloud Storage", amount: 2.99, category: "Software" },
    { vendor: "New York Times", amount: 17.0, category: "News" },
    { vendor: "ChatGPT Plus", amount: 20.0, category: "Software" },
  ]

  // Regular vendors with variable amounts
  const regularVendors = [
    { vendor: "Whole Foods", category: "Groceries", min: 45, max: 180 },
    { vendor: "Amazon", category: "Shopping", min: 15, max: 200 },
    { vendor: "Trader Joe's", category: "Groceries", min: 30, max: 120 },
    { vendor: "Shell Gas Station", category: "Transportation", min: 35, max: 65 },
    { vendor: "Uber", category: "Transportation", min: 12, max: 45 },
    { vendor: "Starbucks", category: "Dining", min: 5, max: 15 },
    { vendor: "Chipotle", category: "Dining", min: 12, max: 18 },
    { vendor: "Target", category: "Shopping", min: 25, max: 150 },
    { vendor: "CVS Pharmacy", category: "Health", min: 10, max: 80 },
    { vendor: "Con Edison", category: "Utilities", min: 80, max: 180 },
    { vendor: "Verizon Wireless", category: "Utilities", min: 85, max: 95 },
    { vendor: "DoorDash", category: "Dining", min: 20, max: 55 },
    { vendor: "Costco", category: "Groceries", min: 100, max: 350 },
    { vendor: "Home Depot", category: "Home", min: 30, max: 200 },
    { vendor: "Sweetgreen", category: "Dining", min: 14, max: 20 },
  ]

  let id = 1

  // Generate 6 months of data
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)

    // Add subscriptions for each month
    subscriptions.forEach((sub, index) => {
      const chargeDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 + index * 3)
      if (chargeDate <= now) {
        transactions.push({
          id: `txn-${id++}`,
          date: chargeDate,
          description: `${sub.vendor} - Monthly subscription`,
          amount: sub.amount,
          vendor: sub.vendor,
          category: sub.category,
          isSubscription: true,
        })
      }
    })

    // Add random regular transactions throughout the month
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

    // Generate 20-35 transactions per month
    const numTransactions = Math.floor(Math.random() * 15) + 20

    for (let i = 0; i < numTransactions; i++) {
      const vendorInfo = regularVendors[Math.floor(Math.random() * regularVendors.length)]
      const day = Math.floor(Math.random() * daysInMonth) + 1
      const txnDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)

      if (txnDate <= now) {
        const amount = Math.round((Math.random() * (vendorInfo.max - vendorInfo.min) + vendorInfo.min) * 100) / 100

        transactions.push({
          id: `txn-${id++}`,
          date: txnDate,
          description: `${vendorInfo.vendor} purchase`,
          amount: amount,
          vendor: vendorInfo.vendor,
          category: vendorInfo.category,
          isSubscription: false,
        })
      }
    }
  }

  // Sort by date descending
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
}
