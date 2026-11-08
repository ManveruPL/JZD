const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

const norm = s => (s || '').trim().toLowerCase().replace(/[\s\?\,\.\!\:\-\"\'\„\”\«\»]+/g, ' ');
const seen = new Map();
const dups = [];

data.forEach((item, idx) => {
  const k = norm(item.question);
  if (seen.has(k)) {
    dups.push({ original: seen.get(k), duplicate: { idx, q: item.question, a: item.answer, c: item.category } });
  } else {
    seen.set(k, { idx, q: item.question, a: item.answer, c: item.category });
  }
});

console.log('Duplicate pairs count:', dups.length);
dups.forEach((d, i) => {
  console.log(`\n#${i+1}:`);
  console.log(`  Orig [${d.original.idx}] [${d.original.c}]: "${d.original.q}" -> "${d.original.a}"`);
  console.log(`  Dup  [${d.duplicate.idx}] [${d.duplicate.c}]: "${d.duplicate.q}" -> "${d.duplicate.a}"`);
});
