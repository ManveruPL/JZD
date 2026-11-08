import fs from 'fs';

const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

function findQuestions(predicate) {
  return questions.filter(predicate);
}

// 1. All questions mentioning "prezydent"
const presidents = findQuestions(q => /prezydent/i.test(q.question + ' ' + q.answer));
console.log(`\n=== PREZYDENT (${presidents.length}) ===`);
presidents.forEach(q => {
  if (/obecn|aktualn|dzis|polski|stanów|francj|rosj/i.test(q.question)) {
    console.log(`[${q.id}] Q: ${q.question} -> A: ${q.answer}`);
  }
});

// 2. All questions mentioning "premier"
const premiers = findQuestions(q => /premier/i.test(q.question + ' ' + q.answer));
console.log(`\n=== PREMIER (${premiers.length}) ===`);
premiers.forEach(q => {
  if (/obecn|aktualn|dzis|polski|brytan|francj/i.test(q.question)) {
    console.log(`[${q.id}] Q: ${q.question} -> A: ${q.answer}`);
  }
});

// 3. All questions mentioning "papież"
const popes = findQuestions(q => /papież/i.test(q.question + ' ' + q.answer));
console.log(`\n=== PAPIEŻ (${popes.length}) ===`);
popes.forEach(q => {
  if (/obecn|aktualn|niem|argentyn|francisz|benedykt|jan paweł/i.test(q.question + ' ' + q.answer)) {
    console.log(`[${q.id}] Q: ${q.question} -> A: ${q.answer}`);
  }
});

// 4. Questions about currency / waluta
const currencies = findQuestions(q => /walut|pieni|monet/i.test(q.question));
console.log(`\n=== WALUTY (${currencies.length}) ===`);
currencies.slice(0, 30).forEach(q => {
  console.log(`[${q.id}] Q: ${q.question} -> A: ${q.answer}`);
});

// 5. Questions about NATO, UE, ONZ
const orgs = findQuestions(q => /\b(nato|ue|onz)\b|unia europejska|narodów zjednoczonych/i.test(q.question));
console.log(`\n=== ORGANIZACJE (${orgs.length}) ===`);
orgs.forEach(q => {
  console.log(`[${q.id}] Q: ${q.question} -> A: ${q.answer}`);
});

// 6. Questions about "ile planet"
const planets = findQuestions(q => /planet/i.test(q.question));
console.log(`\n=== PLANETY (${planets.length}) ===`);
planets.forEach(q => {
  if (/ile|układ|pluton|naj/i.test(q.question)) {
    console.log(`[${q.id}] Q: ${q.question} -> A: ${q.answer}`);
  }
});
