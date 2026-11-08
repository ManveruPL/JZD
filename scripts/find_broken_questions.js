import fs from 'fs';

const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

console.log(`Analyzing ${questions.length} questions...`);

const suspicious = [];

for (const q of questions) {
  const qStr = q.question.trim();
  const aStr = q.answer.trim();

  // Very short question
  if (qStr.length < 15) {
    suspicious.push({ reason: 'VERY_SHORT', q });
  }

  // Missing answer or empty
  if (!aStr || aStr.length < 1) {
    suspicious.push({ reason: 'EMPTY_ANSWER', q });
  }

  // Ends with prepositions or broken fragments
  if (/\b(z|w|na|do|od|o|ze|we)\s*\?+$/i.test(qStr)) {
    suspicious.push({ reason: 'ENDS_WITH_PREPOSITION', q });
  }

  // Answer is just punctuation or placeholder
  if (/^(\?|\.|\-|\.\.\.|brak|n\/a|undefined|null)$/i.test(aStr)) {
    suspicious.push({ reason: 'PLACEHOLDER_ANSWER', q });
  }
}

console.log(`Found ${suspicious.length} suspicious questions:`);
suspicious.forEach(s => {
  console.log(`[${s.reason}] ID: ${s.q.id} | Q: "${s.q.question}" | A: "${s.q.answer}"`);
});
