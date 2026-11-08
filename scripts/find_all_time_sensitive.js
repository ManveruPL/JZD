import fs from 'fs';

const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

const matches = [];

for (const q of questions) {
  const qText = q.question.toLowerCase();
  const aText = q.answer.toLowerCase();

  // Check for words related to present time
  if (
    /\bobecn[yaeioąęychm]*/i.test(qText) ||
    /\baktualn[yaeioąęychm]*/i.test(qText) ||
    /\bdzisiejsz[yaeioąęychm]*/i.test(qText) ||
    /\bdziś\b/i.test(qText) ||
    /\bdzisiaj\b/i.test(qText) ||
    /\bteraz\b/i.test(qText) ||
    /\bwspółczesn[yaeioąęychm]*/i.test(qText)
  ) {
    matches.push(q);
  }
}

console.log(`Found ${matches.length} questions matching time words.`);

fs.writeFileSync('scripts/time_sensitive_questions.json', JSON.stringify(matches, null, 2));

matches.forEach((m, i) => {
  console.log(`${i + 1}. [ID: ${m.id}] [${m.category}] Q: ${m.question} -> A: ${m.answer}`);
});
