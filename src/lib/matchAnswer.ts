import Fuse from 'fuse.js'

export interface BoardAnswer {
  id: string
  answer_text: string
  points: number
  display_order: number
  is_revealed: boolean
}

/**
 * Matches a player's raw text against the board answers.
 * Uses fuzzy matching so "responsive layout bug" matches "A responsive layout fix".
 * Returns the matched answer or null if no match found.
 */
export function matchAnswer(
  rawAnswer: string,
  boardAnswers: BoardAnswer[]
): BoardAnswer | null {
  const cleaned = rawAnswer.trim().toLowerCase()

  // Skip very short or empty answers
  if (cleaned.length < 2) return null

  // Already revealed answers can't be matched again (first come first served)
  const available = boardAnswers.filter(a => !a.is_revealed)
  if (!available.length) return null

  const fuse = new Fuse(available, {
    keys: ['answer_text'],
    threshold: 0.45,       // 0 = exact, 1 = match anything — 0.45 is forgiving but not silly
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
  })

  const results = fuse.search(cleaned)

  if (!results.length) return null

  const best = results[0]
  // Extra guard: reject if score is too low (fuse score: 0 = perfect, 1 = no match)
  if (best.score && best.score > 0.45) return null

  return best.item
}
