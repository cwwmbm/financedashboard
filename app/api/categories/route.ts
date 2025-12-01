import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json")

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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// GET: Load categories
export async function GET() {
  try {
    ensureDataDir()
    
    if (!fs.existsSync(CATEGORIES_FILE)) {
      return NextResponse.json({
        categories: DEFAULT_CATEGORIES,
        fileExists: false,
      })
    }

    const fileContent = fs.readFileSync(CATEGORIES_FILE, "utf-8")
    const data = JSON.parse(fileContent)
    
    return NextResponse.json({
      categories: data.categories || DEFAULT_CATEGORIES,
      fileExists: true,
    })
  } catch (error) {
    console.error("Error loading categories:", error)
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    )
  }
}

// POST: Save categories
export async function POST(request: NextRequest) {
  try {
    ensureDataDir()
    
    const body = await request.json()
    const { categories } = body

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be an array" },
        { status: 400 }
      )
    }

    // Ensure "Other" is always in the list
    const categoriesWithOther = categories.includes("Other")
      ? categories
      : [...categories, "Other"]

    fs.writeFileSync(
      CATEGORIES_FILE,
      JSON.stringify({ categories: categoriesWithOther }, null, 2),
      "utf-8"
    )

    return NextResponse.json({
      success: true,
      categories: categoriesWithOther,
    })
  } catch (error) {
    console.error("Error saving categories:", error)
    return NextResponse.json(
      { error: "Failed to save categories" },
      { status: 500 }
    )
  }
}

