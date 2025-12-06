"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import { Upload, FileSpreadsheet, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { parseCSV, detectSubscriptions } from "@/lib/csv-parser"
import { generateSampleData } from "@/lib/sample-data"
import type { ParsedData } from "@/lib/types"

// Load vendor-category mappings from API
async function loadVendorCategoryMappings(): Promise<Record<string, string>> {
  try {
    const response = await fetch("/api/vendor-categories")
    if (!response.ok) {
      return {}
    }
    const data = await response.json()
    return data.mappings || {}
  } catch (error) {
    console.error("Failed to load vendor-category mappings:", error)
    return {}
  }
}

interface FileUploadProps {
  onDataParsed: (data: ParsedData) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function FileUpload({ onDataParsed, isLoading, setIsLoading }: FileUploadProps) {
  const [vendorMappings, setVendorMappings] = useState<Record<string, string>>({})

  // Load vendor-category mappings on mount
  useEffect(() => {
    loadVendorCategoryMappings().then(setVendorMappings)
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setIsLoading(true)
      
      // Reload mappings in case they were updated
      const mappings = await loadVendorCategoryMappings()
      setVendorMappings(mappings)
      
      const allTransactions: ParsedData["transactions"] = []

      for (const file of Array.from(files)) {
        if (file.type === "text/csv" || file.name.endsWith(".csv")) {
          const content = await file.text()
          const transactions = parseCSV(content, mappings)
          allTransactions.push(...transactions)
        }
      }

      // Remove duplicates based on date + amount + description
      const unique = allTransactions.filter(
        (t, i, arr) =>
          arr.findIndex(
            (x) => x.date.getTime() === t.date.getTime() && x.amount === t.amount && x.description === t.description,
          ) === i,
      )

      // Detect subscriptions on the combined set of transactions
      const withSubscriptions = detectSubscriptions(unique)

      setIsLoading(false)
      onDataParsed({ transactions: withSubscriptions })
    },
    [onDataParsed, setIsLoading],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
    },
    [handleFiles],
  )

  const loadSampleData = useCallback(() => {
    const sampleTransactions = generateSampleData()
    onDataParsed({ transactions: sampleTransactions })
  }, [onDataParsed])

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3 text-balance">Upload Your Bank Statements</h1>
        <p className="text-muted-foreground text-balance">
          Drop your CSV files to analyze spending patterns, track subscriptions, and discover insights
        </p>
      </div>

      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
        <CardContent className="p-0">
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center p-12 cursor-pointer"
          >
            <input type="file" accept=".csv" multiple onChange={handleChange} className="hidden" disabled={isLoading} />
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-primary" />
              )}
            </div>
            <p className="font-medium mb-1">{isLoading ? "Processing..." : "Drop CSV files here or click to browse"}</p>
            <p className="text-sm text-muted-foreground">Supports multiple files from different banks</p>
          </label>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={loadSampleData} className="gap-2 bg-transparent">
          <FileSpreadsheet className="w-4 h-4" />
          Load Sample Data
          <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="text-xs text-muted-foreground mt-2">Try the dashboard with example transactions</p>
      </div>
    </div>
  )
}
