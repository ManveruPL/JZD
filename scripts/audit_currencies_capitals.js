import fs from 'fs';

const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

// Check all questions about currencies
const currencyQs = questions.filter(q => {
  const text = (q.question + ' ' + q.answer).toLowerCase();
  return text.includes('walut') || text.includes('pieniądz') || text.includes('pieniądzem') || text.includes('walutą');
});

console.log(`\n=== ALL CURRENCY QUESTIONS (${currencyQs.length}) ===`);
currencyQs.forEach(q => console.log(`[${q.id}] ${q.question} -> ${q.answer}`));

// Check all questions about capitals
const capitalQs = questions.filter(q => {
  const text = (q.question + ' ' + q.answer).toLowerCase();
  return text.includes('stolic') && !text.includes('apostolsk');
});

console.log(`\n=== ALL CAPITAL QUESTIONS (${capitalQs.length}) ===`);
capitalQs.forEach(q => {
  // Print if asks about capital of a country
  if (/stolicą|stolica|stolicy/i.test(q.question)) {
    console.log(`[${q.id}] ${q.question} -> ${q.answer}`);
  }
});
