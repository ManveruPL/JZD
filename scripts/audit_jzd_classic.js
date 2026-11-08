import fs from 'fs';

const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

const classic = questions.filter(q => q.source === 'jzd-classic');
console.log(`Total jzd-classic questions: ${classic.length}`);

// Check for all questions in classic that have "kto jest", "jak się nazywa", "obecny", "aktualny", "król", "prezydent", "premier"
const sensitiveClassic = classic.filter(q => {
  const t = (q.question + ' ' + q.answer).toLowerCase();
  return /obecn|aktualn|król|prezydent|premier|papież|mistrz|trener|selekcjoner|walut|stolic|najwyższ|największ|ile lat/i.test(t);
});

console.log(`Found ${sensitiveClassic.length} potentially sensitive questions in classic:`);
fs.writeFileSync('scripts/sensitive_classic.json', JSON.stringify(sensitiveClassic, null, 2));

sensitiveClassic.forEach(q => {
  console.log(`[${q.id}] [${q.category}] ${q.question} -> ${q.answer}`);
});
