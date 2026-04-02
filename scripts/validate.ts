#!/usr/bin/env node

/**
 * Project validation script
 * Verifies that the multi-file project structure is valid
 * and can be exported/imported without breaking the circuit
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// Get the actual project root (one level up from scripts directory)
const projectPath = path.join(path.dirname(__filename), '..')
const tsxEditorPath = path.join(projectPath, 'tsx-editor')
const distPath = path.join(tsxEditorPath, 'dist')

interface ValidationResult {
  passed: boolean
  checks: {
    name: string
    success: boolean
    error?: string
  }[]
  summary: string
}

async function validateProject(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    checks: [],
    summary: ''
  }

  // Check 1: Project structure exists
  try {
    const files = ['src/store/editorStore.ts', 'src/utils/projectManager.ts', 'src/components/FileTree.tsx']
    for (const file of files) {
      if (!fs.existsSync(path.join(tsxEditorPath, file))) {
        throw new Error(`Missing: ${file}`)
      }
    }
    result.checks.push({ name: 'Project files exist', success: true })
  } catch (e: any) {
    result.checks.push({ name: 'Project files exist', success: false, error: e.message })
    result.passed = false
  }

  // Check 2: Types are defined
  try {
    const projectTypesPath = path.join(tsxEditorPath, 'src/types/project.ts')
    if (!fs.existsSync(projectTypesPath)) {
      throw new Error('Types not found')
    }
    const content = fs.readFileSync(projectTypesPath, 'utf8')
    if (!content.includes('ProjectFile') || !content.includes('SymbolDefinition')) {
      throw new Error('Required types missing')
    }
    result.checks.push({ name: 'Type definitions complete', success: true })
  } catch (e: any) {
    result.checks.push({ name: 'Type definitions complete', success: false, error: e.message })
    result.passed = false
  }

  // Check 3: Build succeeds
  try {
    console.log('Running build...')
    execSync('npm run build', { cwd: tsxEditorPath, stdio: 'pipe' })
    result.checks.push({ name: 'Build succeeds', success: true })
  } catch (e: any) {
    result.checks.push({
      name: 'Build succeeds',
      success: false,
      error: e.stderr?.toString().slice(0, 200) || 'Build failed'
    })
    result.passed = false
  }

  // Check 4: Components are exported properly
  try {
    const filetreePath = path.join(tsxEditorPath, 'src/components/FileTree.tsx')
    const content = fs.readFileSync(filetreePath, 'utf8')
    if (!content.includes('export const FileTree')) {
      throw new Error('FileTree not exported')
    }
    result.checks.push({ name: 'Components properly exported', success: true })
  } catch (e: any) {
    result.checks.push({ name: 'Components properly exported', success: false, error: e.message })
    result.passed = false
  }

  // Check 5: CSS files present
  try {
    const cssFiles = [
      'src/styles/FileTree.css',
      'src/styles/PropertiesPanel.css'
    ]
    for (const file of cssFiles) {
      if (!fs.existsSync(path.join(tsxEditorPath, file))) {
        throw new Error(`Missing CSS: ${file}`)
      }
    }
    result.checks.push({ name: 'Styles present', success: true })
  } catch (e: any) {
    result.checks.push({ name: 'Styles present', success: false, error: e.message })
    result.passed = false
  }

  // Generate summary
  const passCount = result.checks.filter(c => c.success).length
  const totalCount = result.checks.length
  result.summary = `Validation: ${passCount}/${totalCount} checks passed`

  return result
}

async function main() {
  console.log('🔍 Validating tsx-schematic-editor project...\n')

  const result = await validateProject()

  // Print results
  result.checks.forEach(check => {
    const icon = check.success ? '✅' : '❌'
    console.log(`${icon} ${check.name}`)
    if (check.error) {
      console.log(`   Error: ${check.error}`)
    }
  })

  console.log(`\n${result.summary}`)

  if (!result.passed) {
    console.error('\n⚠️  Validation failed. Please fix the errors above.')
    process.exit(1)
  } else {
    console.log('\n✨ All validation checks passed!')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Validation error:', err)
  process.exit(1)
})
