"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, X } from "lucide-react"
import type { Transaction } from "@/lib/types"

interface CategoryManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: Transaction[]
  onUpdateTransactions: (updatedTransactions: Transaction[]) => void
}

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

// Save categories to API
async function saveCategories(categories: string[]): Promise<void> {
  try {
    await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ categories }),
    })
  } catch (error) {
    console.error("Failed to save categories:", error)
  }
}

export function CategoryManager({
  open,
  onOpenChange,
  transactions,
  onUpdateTransactions,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Load categories when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories().then(setCategories)
    }
  }, [open])

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim()
    if (trimmed && !categories.includes(trimmed)) {
      const updated = [...categories, trimmed].sort()
      setCategories(updated)
      await saveCategories(updated)
      setNewCategory("")
    }
  }

  const handleDeleteCategory = async (categoryToDelete: string) => {
    // Prevent deleting "Other" as it's required
    if (categoryToDelete === "Other") {
      return
    }

    // Remove category from list
    const updated = categories.filter((cat) => cat !== categoryToDelete)
    setCategories(updated)
    await saveCategories(updated)

    // Convert all transactions with this category to "Other"
    const updatedTransactions = transactions.map((t) => {
      if (t.category === categoryToDelete) {
        return { ...t, category: "Other" }
      }
      return t
    })

    onUpdateTransactions(updatedTransactions)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddCategory()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleAddCategory} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Category list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {categories.map((category) => (
              <div
                key={category}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <span className="text-sm">{category}</span>
                {category === "Other" ? (
                  <span className="text-xs text-muted-foreground">Required</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteCategory(category)}
                    className="h-6 w-6 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

