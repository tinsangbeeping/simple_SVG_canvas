/**
 * Minimal s-expression tokenizer and parser for KiCad files
 * Supports: (symbol ...), nested lists, strings, atoms
 */

export type SExp = string | SExp[]

export function tokenize(input: string): string[] {
  const tokens: string[] = []
  let i = 0
  
  while (i < input.length) {
    const ch = input[i]
    
    // Skip whitespace
    if (/\s/.test(ch)) {
      i++
      continue
    }
    
    // Comment (starts with ;)
    if (ch === ';') {
      while (i < input.length && input[i] !== '\n') i++
      continue
    }
    
    // Left paren
    if (ch === '(') {
      tokens.push('(')
      i++
      continue
    }
    
    // Right paren
    if (ch === ')') {
      tokens.push(')')
      i++
      continue
    }
    
    // Quoted string
    if (ch === '"') {
      let str = ''
      i++ // skip opening "
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          str += input[i + 1]
          i += 2
        } else {
          str += input[i]
          i++
        }
      }
      i++ // skip closing "
      tokens.push(str)
      continue
    }
    
    // Atom (unquoted)
    let atom = ''
    while (i < input.length && !/[\s()\"]/.test(input[i])) {
      atom += input[i]
      i++
    }
    if (atom) tokens.push(atom)
  }
  
  return tokens
}

export function parse(tokens: string[]): SExp {
  let index = 0
  
  function parseOne(): SExp {
    const token = tokens[index++]
    if (token === '(') {
      const list: SExp[] = []
      while (tokens[index] !== ')') {
        list.push(parseOne())
      }
      index++ // skip ')'
      return list
    }
    return token
  }
  
  return parseOne()
}

export function parseSExp(input: string): SExp {
  const tokens = tokenize(input)
  return parse(tokens)
}

/**
 * Helper: find all immediate children matching (key ...)
 */
export function findAll(sexp: SExp, key: string): SExp[] {
  if (!Array.isArray(sexp)) return []
  return sexp.filter((child): child is SExp[] => 
    Array.isArray(child) && child[0] === key
  )
}

/**
 * Helper: find first immediate child matching (key ...)
 */
export function findOne(sexp: SExp, key: string): SExp[] | null {
  if (!Array.isArray(sexp)) return null
  const found = sexp.find((child): child is SExp[] => 
    Array.isArray(child) && child[0] === key
  )
  return found || null
}

/**
 * Helper: get string value from (key "value")
 */
export function getValue(sexp: SExp[] | null): string {
  if (!sexp || sexp.length < 2) return ''
  const val = sexp[1]
  return typeof val === 'string' ? val : ''
}
