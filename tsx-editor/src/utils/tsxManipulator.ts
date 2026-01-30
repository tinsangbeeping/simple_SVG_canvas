import * as parser from '@babel/parser'
import generate from '@babel/generator'
import traverse from '@babel/traverse'
import * as t from '@babel/types'

/**
 * TSX Manipulation Engine
 * Provides utilities to parse, modify, and regenerate TSX code
 */

export interface TSXManipulator {
  parse: (code: string) => any
  updateProp: (ast: any, componentName: string, propName: string, propValue: any) => any
  insertComponent: (ast: any, tsxSnippet: string) => any
  removeComponent: (ast: any, componentName: string) => any
  generate: (ast: any) => string
}

export const tsxManipulator: TSXManipulator = {
  /**
   * Parse TSX code into AST
   */
  parse: (code: string) => {
    try {
      return parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      })
    } catch (error) {
      console.error('Parse error:', error)
      throw error
    }
  },

  /**
   * Update a prop value for a specific component by name
   */
  updateProp: (ast: any, componentName: string, propName: string, propValue: any) => {
    traverse(ast, {
      JSXElement(path: any) {
        const openingElement = path.node.openingElement
        const nameAttr = openingElement.attributes.find(
          (attr: any) => attr.type === 'JSXAttribute' && attr.name.name === 'name'
        )

        if (nameAttr && nameAttr.value.value === componentName) {
          // Find and update the prop
          const propAttr = openingElement.attributes.find(
            (attr: any) => attr.type === 'JSXAttribute' && attr.name.name === propName
          )

          const newValue = typeof propValue === 'number'
            ? t.jsxExpressionContainer(t.numericLiteral(propValue))
            : t.stringLiteral(propValue)

          if (propAttr) {
            propAttr.value = newValue
          } else {
            openingElement.attributes.push(
              t.jsxAttribute(t.jsxIdentifier(propName), newValue)
            )
          }
        }
      }
    })

    return ast
  },

  /**
   * Insert a new component (from TSX snippet) into the board
   */
  insertComponent: (ast: any, tsxSnippet: string) => {
    const snippetAst = parser.parse(`<>${tsxSnippet}</>`, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    })

    let newElement: any = null
    traverse(snippetAst, {
      JSXElement(path: any) {
        if (!newElement) {
          newElement = path.node
        }
      }
    })

    if (!newElement) return ast

    traverse(ast, {
      JSXElement(path: any) {
        const openingElement = path.node.openingElement
        if (openingElement.name.name === 'board') {
          path.node.children.push(t.jsxText('\n      '))
          path.node.children.push(newElement)
        }
      }
    })

    return ast
  },

  /**
   * Remove a component by name
   */
  removeComponent: (ast: any, componentName: string) => {
    traverse(ast, {
      JSXElement(path: any) {
        const openingElement = path.node.openingElement
        const nameAttr = openingElement.attributes.find(
          (attr: any) => attr.type === 'JSXAttribute' && attr.name.name === 'name'
        )

        if (nameAttr && nameAttr.value.value === componentName) {
          path.remove()
        }
      }
    })

    return ast
  },

  /**
   * Generate code from AST
   */
  generate: (ast: any) => {
    const output = generate(ast, {
      retainLines: false,
      compact: false
    })
    return output.code
  }
}

/**
 * High-level helper to update component props in TSX code
 */
export function updateComponentInTSX(
  tsxCode: string,
  componentName: string,
  props: Record<string, any>
): string {
  try {
    let ast = tsxManipulator.parse(tsxCode)
    
    for (const [propName, propValue] of Object.entries(props)) {
      ast = tsxManipulator.updateProp(ast, componentName, propName, propValue)
    }

    return tsxManipulator.generate(ast)
  } catch (error) {
    console.error('Error updating component:', error)
    return tsxCode
  }
}

/**
 * Insert component snippet into TSX
 */
export function insertComponentIntoTSX(tsxCode: string, tsxSnippet: string): string {
  try {
    let ast = tsxManipulator.parse(tsxCode)
    ast = tsxManipulator.insertComponent(ast, tsxSnippet)
    return tsxManipulator.generate(ast)
  } catch (error) {
    console.error('Error inserting component:', error)
    return tsxCode
  }
}

/**
 * Remove component from TSX
 */
export function removeComponentFromTSX(tsxCode: string, componentName: string): string {
  try {
    let ast = tsxManipulator.parse(tsxCode)
    ast = tsxManipulator.removeComponent(ast, componentName)
    return tsxManipulator.generate(ast)
  } catch (error) {
    console.error('Error removing component:', error)
    return tsxCode
  }
}
