const fs = require('fs');

const existing = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

const norm = s => (s || '').trim().toLowerCase().replace(/[\s\?\,\.\!\:\-\"\'\„\”\«\»]+/g, ' ');

const existingSet = new Set();
existing.forEach(x => {
  if (x.question) existingSet.add(norm(x.question));
});

let polevalTotal = 0;
let duplicatesWithExisting = 0;
let uniqueNew = 0;
const newItems = [];

['dev-0', 'test-A', 'test-B'].forEach(dir => {
  const inLines = fs.readFileSync('temp_poleval/' + dir + '/in.tsv', 'utf8').trim().split('\n');
  const expLines = fs.readFileSync('temp_poleval/' + dir + '/expected.tsv', 'utf8').trim().split('\n');

  inLines.forEach((q, idx) => {
    polevalTotal++;
    const qNorm = norm(q);
    if (existingSet.has(qNorm)) {
      duplicatesWithExisting++;
    } else {
      uniqueNew++;
      existingSet.add(qNorm);
      newItems.push({
        source: 'poleval-2021-' + dir,
        question: q.trim(),
        answer: expLines[idx].trim()
      });
    }
  });
});

console.log('Existing questions in data/questions.json:', existing.length);
console.log('PolEval total questions:', polevalTotal);
console.log('Duplicates with existing questions:', duplicatesWithExisting);
console.log('New unique questions from PolEval:', uniqueNew);
console.log('Combined total will be:', existing.length + uniqueNew);
