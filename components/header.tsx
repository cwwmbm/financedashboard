import { Wallet } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">SpendSense</span>
        </div>
        <p className="text-sm text-muted-foreground hidden sm:block">Personal Finance Dashboard</p>
      </div>
    </header>
  )
}
