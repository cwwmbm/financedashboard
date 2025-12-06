import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const VENDOR_CATEGORIES_FILE = path.join(DATA_DIR, "vendor-categories.json")

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// GET: Load vendor-category mappings
export async function GET() {
  try {
    ensureDataDir()
    
    if (!fs.existsSync(VENDOR_CATEGORIES_FILE)) {
      return NextResponse.json({
        mappings: {},
        fileExists: false,
      })
    }

    const fileContent = fs.readFileSync(VENDOR_CATEGORIES_FILE, "utf-8")
    const data = JSON.parse(fileContent)
    
    return NextResponse.json({
      mappings: data.mappings || {},
      fileExists: true,
    })
  } catch (error) {
    console.error("Error loading vendor-category mappings:", error)
    return NextResponse.json(
      { error: "Failed to load vendor-category mappings", mappings: {} },
      { status: 500 }
    )
  }
}

// POST: Save vendor-category mappings
export async function POST(request: NextRequest) {
  try {
    ensureDataDir()
    
    const body = await request.json()
    const { vendor, category } = body

    if (!vendor || !category) {
      return NextResponse.json(
        { error: "Vendor and category are required" },
        { status: 400 }
      )
    }

    // Load existing mappings
    let mappings: Record<string, string> = {}
    if (fs.existsSync(VENDOR_CATEGORIES_FILE)) {
      const fileContent = fs.readFileSync(VENDOR_CATEGORIES_FILE, "utf-8")
      const data = JSON.parse(fileContent)
      mappings = data.mappings || {}
    }

    // Update the mapping
    mappings[vendor] = category

    // Save back to file
    fs.writeFileSync(
      VENDOR_CATEGORIES_FILE,
      JSON.stringify({ mappings, lastUpdated: new Date().toISOString() }, null, 2),
      "utf-8"
    )

    return NextResponse.json({
      success: true,
      mappings,
    })
  } catch (error) {
    console.error("Error saving vendor-category mapping:", error)
    return NextResponse.json(
      { error: "Failed to save vendor-category mapping" },
      { status: 500 }
    )
  }
}

// PUT: Update multiple mappings at once
export async function PUT(request: NextRequest) {
  try {
    ensureDataDir()
    
    const body = await request.json()
    const { mappings: newMappings } = body

    if (!newMappings || typeof newMappings !== "object") {
      return NextResponse.json(
        { error: "Mappings object is required" },
        { status: 400 }
      )
    }

    // Load existing mappings
    let existingMappings: Record<string, string> = {}
    if (fs.existsSync(VENDOR_CATEGORIES_FILE)) {
      const fileContent = fs.readFileSync(VENDOR_CATEGORIES_FILE, "utf-8")
      const data = JSON.parse(fileContent)
      existingMappings = data.mappings || {}
    }

    // Merge new mappings with existing ones
    const mergedMappings = { ...existingMappings, ...newMappings }

    // Save back to file
    fs.writeFileSync(
      VENDOR_CATEGORIES_FILE,
      JSON.stringify({ mappings: mergedMappings, lastUpdated: new Date().toISOString() }, null, 2),
      "utf-8"
    )

    return NextResponse.json({
      success: true,
      mappings: mergedMappings,
    })
  } catch (error) {
    console.error("Error updating vendor-category mappings:", error)
    return NextResponse.json(
      { error: "Failed to update vendor-category mappings" },
      { status: 500 }
    )
  }
}

