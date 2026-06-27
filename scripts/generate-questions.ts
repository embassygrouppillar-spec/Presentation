/**
 * scripts/generate-questions.ts
 * Run ONCE before your meeting: npx ts-node scripts/generate-questions.ts
 *
 * Loops through all 18 members, calls Anthropic API for each,
 * generates a funny personalized Family Feud question + 6 answers,
 * saves everything to Supabase.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GeneratedQuestion {
  question_text: string
  answers: { text: string; points: number }[]
}

async function generateForMember(
  name: string,
  role: string,
  company: string,
  funFacts: string
): Promise<GeneratedQuestion> {
  const prompt = `You are the host of a Family Feud game for a B&I (Business Networking) group of 18 professionals. 

Generate ONE funny, roast-friendly survey question specifically about this person:
- Name: ${name}
- Role: ${role}
- Company: ${company}
- Fun facts: ${funFacts}

The question should:
- Start with "We surveyed 100 people..." or "Name something..."
- Be specifically about their profession or known personality traits
- Be funny and slightly roast-y but warm and friendly
- Make the whole room laugh because they KNOW this person

Then provide exactly 6 answers that were "surveyed", ranked by how many people said them.
Points must add up to exactly 100.

Return ONLY valid JSON, no markdown, no explanation:
{
  "question_text": "We surveyed 100 people: Name something a [their role] says that...",
  "answers": [
    {"text": "answer 1", "points": 35},
    {"text": "answer 2", "points": 25},
    {"text": "answer 3", "points": 18},
    {"text": "answer 4", "points": 12},
    {"text": "answer 5", "points": 7},
    {"text": "answer 6", "points": 3}
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .map(b => (b.type === 'text' ? b.text : ''))
    .join('')
    .replace(/```json|```/g, '')
    .trim()

  return JSON.parse(text)
}

async function main() {
  console.log('🎮 B&I Family Feud — Question Generator\n')

  // Fetch all members
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .order('display_order')

  if (error || !members?.length) {
    console.error('❌ Could not load members. Did you run the seed SQL?', error)
    process.exit(1)
  }

  console.log(`Found ${members.length} members. Generating questions...\n`)

  for (const member of members) {
    process.stdout.write(`  Generating for ${member.name} (${member.role})... `)

    try {
      const generated = await generateForMember(
        member.name,
        member.role,
        member.company,
        member.fun_facts
      )

      // Insert question
      const { data: question, error: qErr } = await supabase
        .from('questions')
        .insert({
          member_id: member.id,
          question_text: generated.question_text,
        })
        .select()
        .single()

      if (qErr || !question) throw qErr

      // Insert 6 answers
      const answerRows = generated.answers.map((a, i) => ({
        question_id: question.id,
        answer_text: a.text,
        points: a.points,
        display_order: i + 1,
        is_revealed: false,
      }))

      await supabase.from('question_answers').insert(answerRows)

      console.log(`✅ "${generated.question_text.slice(0, 60)}..."`)
    } catch (err) {
      console.log(`❌ Failed — ${err}`)
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n✨ All questions generated! Review them in your Supabase dashboard before the meeting.')
  console.log('   You can edit any question_text or answer_text directly in the DB.\n')
}

main()
