import fs from 'fs';

const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));
console.log(`Total questions loaded: ${questions.length}`);

// Patterns of time-sensitive or potentially outdated questions
const timeKeywords = [
  /\bobecn[yaeioąęychm]+/i,
  /\baktualn[yaeioąęychm]+/i,
  /\bdzisiaj\b/i,
  /\bdziś\b/i,
  /\bteraz\b/i,
  /\bwspółczesn[yaeioąęychm]+/i,
  /\bnajnowsz[yaeioąęychm]+/i
];

const politicalKeywords = [
  /\bprezydent\w*/i,
  /\bpremier\w*/i,
  /\bmonarch\w*/i,
  /\bkról\w*/i,
  /\bkrólow\w*/i,
  /\bpapież\w*/i,
  /\bkanclerz\w*/i,
  /\bsekretarz generaln\w*/i,
  /\bprzewodnicząc\w*/i
];

const geopoliticalKeywords = [
  /\bnato\b/i,
  /\bunia europejsk\w*/i,
  /\bue\b/i,
  /\bwalut\w*/i,
  /\bchorwacj\w*/i,
  /\bczłonk\w*/i
];

const candidateAudits = [];

for (const q of questions) {
  const fullText = `${q.question} ${q.answer} ${(q.aliases || []).join(' ')}`;
  
  const hasTimeTerm = timeKeywords.some(pattern => pattern.test(fullText));
  const hasPolitical = politicalKeywords.some(pattern => pattern.test(fullText));
  const hasGeo = geopoliticalKeywords.some(pattern => pattern.test(fullText));

  if (hasTimeTerm || (hasPolitical && (hasTimeTerm || /wielk\w* brytan\w*|angli\w*|kanad\w*|australi\w*/i.test(fullText))) || /chorwacj\w*.*walut|walut\w*.*chorwacj/i.test(fullText)) {
    candidateAudits.push({
      id: q.id,
      question: q.question,
      answer: q.answer,
      aliases: q.aliases || [],
      category: q.category,
      hasTimeTerm,
      hasPolitical,
      hasGeo
    });
  }
}

console.log(`Found ${candidateAudits.length} potentially time-sensitive questions.`);

// Group and display specific interesting targets
const monarchs = candidateAudits.filter(c => /król|monarch|głow\w* państw/i.test(c.question + ' ' + c.answer));
console.log(`\n--- MONARCH / HEAD OF STATE (${monarchs.length}) ---`);
monarchs.slice(0, 20).forEach(m => console.log(`[${m.id}] ${m.question} -> ${m.answer} (aliases: ${m.aliases.join(', ')})`));

const presAndPremiers = candidateAudits.filter(c => /prezydent|premier|kanclerz/i.test(c.question + ' ' + c.answer) && c.hasTimeTerm);
console.log(`\n--- CURRENT PRESIDENTS / PREMIERS (${presAndPremiers.length}) ---`);
presAndPremiers.slice(0, 25).forEach(m => console.log(`[${m.id}] ${m.question} -> ${m.answer}`));

const geoOrCurrency = candidateAudits.filter(c => /nato|unia europejska|walut|chorwacj/i.test(c.question + ' ' + c.answer));
console.log(`\n--- GEO / CURRENCY / BLOCS (${geoOrCurrency.length}) ---`);
geoOrCurrency.slice(0, 25).forEach(m => console.log(`[${m.id}] ${m.question} -> ${m.answer}`));
