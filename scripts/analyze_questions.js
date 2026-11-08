const fs = require('fs');

const raw = fs.readFileSync('data/questions.json', 'utf8');
const data = JSON.parse(raw);

console.log('Total count:', data.length);

const categories = {};
let emptyQ = 0, emptyA = 0;
const questionsMap = new Map();
let duplicateQCount = 0;
const duplicates = [];

data.forEach((item, index) => {
  const cat = (item.category || '').trim();
  categories[cat] = (categories[cat] || 0) + 1;

  if (!item.question || !item.question.trim()) emptyQ++;
  if (!item.answer || !item.answer.trim()) emptyA++;

  const normQ = (item.question || '').trim().toLowerCase().replace(/[\s\?\,\.\!\:\-\"\']+/g, ' ');
  if (questionsMap.has(normQ)) {
    duplicateQCount++;
    duplicates.push({ original: questionsMap.get(normQ), duplicate: { index, q: item.question, a: item.answer } });
  } else {
    questionsMap.set(normQ, { index, q: item.question, a: item.answer });
  }
});

console.log('Empty questions:', emptyQ);
console.log('Empty answers:', emptyA);
console.log('Duplicate questions count:', duplicateQCount);
console.log('Unique questions count:', questionsMap.size);

const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
console.log('\nTop 30 Categories:');
console.table(sortedCats.slice(0, 30));
console.log('Total unique categories:', Object.keys(categories).length);
console.log('\nAll categories count < 5:');
console.log(sortedCats.filter(([_, c]) => c < 5).map(([cat]) => cat));

console.log('\nSample 5 Duplicates:');
console.log(JSON.stringify(duplicates.slice(0, 5), null, 2));
