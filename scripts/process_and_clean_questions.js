const fs = require('fs');
const path = require('path');

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\s+([?,.!;:])/g, '$1')
    .replace(/^["„«]\s*/, '"')
    .replace(/\s*["”»]$/, '"');
}

function cleanAnswer(str) {
  if (!str) return '';
  let a = cleanText(str);
  // remove leading dots or dashes if just typo: e.g. ".wróbel..."
  a = a.replace(/^\.+/, '').trim();
  return a;
}

const norm = s => (s || '').trim().toLowerCase().replace(/[\s\?\,\.\!\:\-\"\'\„\”\«\»]+/g, ' ');

// 1. Process Original Dataset
console.log('Loading data/questions.json...');
const originalRaw = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

// Backup original if not already backed up
if (!fs.existsSync('data/questions.original.json')) {
  fs.writeFileSync('data/questions.original.json', JSON.stringify(originalRaw, null, 2), 'utf8');
  console.log('Backup created: data/questions.original.json');
}

const cleanedOriginal = [];
const seenQuestions = new Map();

originalRaw.forEach((item, idx) => {
  let q = cleanText(item.question);
  let a = cleanAnswer(item.answer);
  let cat = (item.category || 'ciekawostki').trim().toLowerCase();

  // Fix known broken items
  if (idx === 3000 && !a) {
    a = 'endemit'; // "Jak nazywamy gatunek występujący jedynie na ściśle ograniczonym, niewielkim terenie?"
  }
  if (idx === 4858 && !a) {
    // Malformed question without single answer
    return; // skip
  }
  if (!q || !a) return;

  // Normalize category
  if (cat === 'wb') cat = 'wielka-brytania';

  const qKey = norm(q);
  if (seenQuestions.has(qKey)) {
    // Duplicate question within original set
    return;
  }

  seenQuestions.set(qKey, true);
  cleanedOriginal.push({
    question: q,
    answer: a,
    category: cat,
    source: 'jzd-classic'
  });
});

console.log(`Original questions after deduplication & cleaning: ${cleanedOriginal.length}`);

// 2. Process PolEval 2021 Datasets
const polevalItems = [];
const polevalDirs = [
  { dir: 'temp_poleval/dev-0', source: 'poleval-2021-dev' },
  { dir: 'temp_poleval/test-A', source: 'poleval-2021-testA' },
  { dir: 'temp_poleval/test-B', source: 'poleval-2021-testB' }
];

polevalDirs.forEach(({ dir, source }) => {
  if (!fs.existsSync(dir + '/in.tsv') || !fs.existsSync(dir + '/expected.tsv')) {
    console.warn(`Directory ${dir} missing tsv files!`);
    return;
  }
  const inLines = fs.readFileSync(dir + '/in.tsv', 'utf8').trim().split('\n');
  const expLines = fs.readFileSync(dir + '/expected.tsv', 'utf8').trim().split('\n');

  inLines.forEach((rawQ, i) => {
    const rawExp = expLines[i] || '';
    const q = cleanText(rawQ);
    if (!q || !rawExp) return;

    // Check answers (might have tab separated aliases)
    const answers = rawExp.split('\t').map(cleanAnswer).filter(Boolean);
    if (answers.length === 0) return;

    const primaryAnswer = answers[0];
    const aliases = answers.length > 1 ? answers.slice(1) : undefined;

    const qKey = norm(q);
    if (seenQuestions.has(qKey)) {
      return; // Skip duplicate with original or previously added
    }

    seenQuestions.set(qKey, true);
    polevalItems.push({
      question: q,
      answer: primaryAnswer,
      ...(aliases ? { aliases } : {}),
      category: 'wiedza-ogolna',
      source
    });
  });
});

console.log(`PolEval unique new questions added: ${polevalItems.length}`);

// 3. Combine and assign sequential IDs
const allQuestions = [...cleanedOriginal, ...polevalItems].map((item, index) => ({
  id: index + 1,
  ...item
}));

console.log(`Total questions in combined database: ${allQuestions.length}`);

// Category breakdown
const categoryCounts = {};
allQuestions.forEach(q => {
  categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
});
console.log('Categories summary:', categoryCounts);

// Save datasets
fs.writeFileSync('data/questions.json', JSON.stringify(allQuestions, null, 2), 'utf8');
fs.writeFileSync('data/questions_classic.json', JSON.stringify(cleanedOriginal.map((item, i) => ({ id: i + 1, ...item })), null, 2), 'utf8');
fs.writeFileSync('data/questions_poleval.json', JSON.stringify(polevalItems.map((item, i) => ({ id: i + 1, ...item })), null, 2), 'utf8');

// Also save summary categories file
const categoriesMeta = Object.entries(categoryCounts).map(([cat, count]) => ({
  id: cat,
  name: cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  count
})).sort((a, b) => b.count - a.count);

fs.writeFileSync('data/categories.json', JSON.stringify(categoriesMeta, null, 2), 'utf8');

console.log('Successfully saved data/questions.json, data/questions_classic.json, data/questions_poleval.json, data/categories.json');
