"use client"

import { Wallet, Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { exportToCSV, getExportCount } from "@/lib/export"
import type { Transaction } from "@/lib/types"
import type { DateFilter } from "@/app/page"

interface HeaderProps {
  dateFilter?: DateFilter | null
  onDateFilterChange?: (filter: DateFilter | null) => void
  dateRange?: { min: Date | null; max: Date | null }
  transactions?: Transaction[]
}

export function Header({ dateFilter, onDateFilterChange, dateRange, transactions = [] }: HeaderProps) {
  const handleExport = () => {
    if (transactions.length === 0) {
      alert("No transactions to export")
      return
    }
    exportToCSV(transactions)
  }

  const handleFromDateChange = (date: Date | undefined) => {
    if (!date) return
    const newFilter: DateFilter = {
      from: date,
      to: dateFilter?.to || null
    }
    onDateFilterChange?.(newFilter)
  }

  const handleToDateChange = (date: Date | undefined) => {
    if (!date) return
    const newFilter: DateFilter = {
      from: dateFilter?.from || null,
      to: date
    }
    onDateFilterChange?.(newFilter)
  }

  const handleClearFilters = () => {
    onDateFilterChange?.(null)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Select date"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const hasActiveFilter = dateFilter && (dateFilter.from || dateFilter.to)

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg hidden sm:inline">SpendSense</span>
        </div>
        
        <div className="flex items-center gap-2 flex-1 justify-end">
          {dateRange && dateRange.min && dateRange.max && onDateFilterChange && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-sm">
                    From: {formatDate(dateFilter?.from || null)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter?.from || undefined}
                    onSelect={handleFromDateChange}
                    disabled={(date) => {
                      // Disable dates after "to" date if set
                      if (dateFilter?.to && date > dateFilter.to) return true
                      // Disable dates outside transaction range
                      if (dateRange.min && date < dateRange.min) return true
                      if (dateRange.max && date > dateRange.max) return true
                      return false
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-sm">
                    To: {formatDate(dateFilter?.to || null)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter?.to || undefined}
                    onSelect={handleToDateChange}
                    disabled={(date) => {
                      // Disable dates before "from" date if set
                      if (dateFilter?.from && date < dateFilter.from) return true
                      // Disable dates outside transaction range
                      if (dateRange.min && date < dateRange.min) return true
                      if (dateRange.max && date > dateRange.max) return true
                      return false
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 w-9 p-0"
                  title="Clear filters"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          
          {transactions.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              className="h-9 gap-2"
              title={`Export ${getExportCount(transactions)}`}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
