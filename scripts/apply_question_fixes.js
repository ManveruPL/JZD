import fs from 'fs';

const questionsPath = 'data/questions.json';
const categoriesPath = 'data/categories.json';

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
console.log(`Original questions count: ${questions.length}`);

// IDs to remove completely (jokes, broken fragments, unanswerable soap-opera viewer counts)
const idsToRemove = new Set([255, 605, 1706, 4451, 4580]);

// Specific corrections mapping
const updates = new Map([
  [
    4971,
    {
      question: 'Kto jest obecnym monarchą Wielkiej Brytanii?',
      answer: 'Karol III',
      aliases: ['król Karol III', 'Karol', 'Charles III', 'King Charles III']
    }
  ],
  [
    1016,
    {
      question: 'Kanada pozostaje monarchią konstytucyjną – kto jest jej obecną głową państwa?',
      answer: 'Karol III',
      aliases: ['król Karol III', 'Karol', 'Charles III', 'monarcha brytyjski']
    }
  ],
  [
    5802,
    {
      question: 'Kto jest formalną głową państwa na Jamajce?',
      answer: 'Karol III',
      aliases: ['król Karol III', 'Karol', 'Charles III', 'monarcha brytyjski']
    }
  ],
  [
    6718,
    {
      question: 'Kto jest formalną głową państwa Związku Australijskiego (Australii)?',
      answer: 'Karol III',
      aliases: ['król Karol III', 'Karol', 'Charles III', 'monarcha brytyjski']
    }
  ],
  [
    5030,
    {
      question: 'Jak miał na imię zmarły w 2021 roku mąż królowej Elżbiety II?',
      answer: 'Filip',
      aliases: ['książę Filip', 'Filip Mountbatten', 'książę Edynburga']
    }
  ],
  [
    5032,
    {
      question: 'Kto był premierem Wielkiej Brytanii z ramienia Partii Pracy w latach 1997–2007?',
      answer: 'Tony Blair',
      aliases: ['Blair']
    }
  ],
  [
    4977,
    {
      question: 'Przy jakiej ulicy w Londynie znajduje się oficjalna rezydencja premiera Wielkiej Brytanii?',
      answer: 'Downing Street',
      aliases: ['10 Downing Street', 'Downing Street 10']
    }
  ],
  [
    4980,
    {
      question: 'Gdzie znajduje się oficjalna londyńska rezydencja brytyjskich monarchów?',
      answer: 'Pałac Buckingham',
      aliases: ['Buckingham', 'Buckingham Palace', 'w Pałacu Buckingham']
    }
  ],
  [
    5003,
    {
      question: 'Jak nazywa się dzielnica Londynu ze słynnym obserwatorium astronomicznym, przez którą przechodzi południk zerowy?',
      answer: 'Greenwich',
      aliases: ['obserwatorium Greenwich']
    }
  ],
  [
    5017,
    {
      question: 'Jak nazywa się słynny wiktoriański most zwodzony nad Tamizą w Londynie?',
      answer: 'Tower Bridge',
      aliases: ['most Tower Bridge']
    }
  ],
  [
    5038,
    {
      question: 'Na jakim słynnym placu w Londynie wznosi się kolumna admirała Nelsona?',
      answer: 'Trafalgar Square',
      aliases: ['plac Trafalgar Square']
    }
  ],
  [
    5039,
    {
      question: 'Jak brzmi pełna oficjalna nazwa państwa brytyjskiego?',
      answer: 'Zjednoczone Królestwo Wielkiej Brytanii i Irlandii Północnej',
      aliases: ['Zjednoczone Królestwo']
    }
  ],
  [
    5040,
    {
      question: 'Jaką funkcję w przeszłości pełniła londyńska twierdza Tower of London?',
      answer: 'więzienie',
      aliases: ['więzienie i miejsce egzekucji', 'twierdza', 'zbrojownia']
    }
  ],
  [
    5045,
    {
      question: 'W jakiej rezydencji w hrabstwie Berkshire monarchowie brytyjscy spędzają tradycyjnie weekendy i święta?',
      answer: 'zamek Windsor',
      aliases: ['Windsor', 'w Windsorze']
    }
  ],
  [
    5061,
    {
      question: 'Ilu synów miał król Karol III z małżeństwa z księżną Dianą?',
      answer: 'dwóch',
      aliases: ['2', 'dwaj synowie']
    }
  ],
  [
    5066,
    {
      question: 'Jak nazywa się znane miejsce w londyńskim Hyde Parku, będące symbolem wolności słowa i debat publicznych?',
      answer: "Speakers' Corner",
      aliases: ['Speakers Corner']
    }
  ],
  [
    10789,
    {
      question: 'Jak nazywał się angielski korsarz, pasowany na rycerza przez królową Elżbietę I i mianowany wiceadmirałem?',
      answer: 'Francis Drake',
      aliases: ['Drake', 'sir Francis Drake']
    }
  ],
  [
    167,
    {
      question: 'Kto pełni urząd prezydenta Rzeczypospolitej Polskiej od 2015 roku?',
      answer: 'Andrzej Duda',
      aliases: ['Duda']
    }
  ],
  [
    1454,
    {
      question: 'Kto pełnił urząd prezydenta Rzeczypospolitej Polskiej w latach 2010–2015?',
      answer: 'Bronisław Komorowski',
      aliases: ['Komorowski']
    }
  ],
  [
    1357,
    {
      question: 'Kto objął urząd Prezesa Rady Ministrów (premiera) Polski w grudniu 2023 roku?',
      answer: 'Donald Tusk',
      aliases: ['Tusk']
    }
  ],
  [
    360,
    {
      question: 'Kto pełni funkcję prezydenta m.st. Warszawy od 2018 roku?',
      answer: 'Rafał Trzaskowski',
      aliases: ['Trzaskowski']
    }
  ],
  [
    1500,
    {
      question: 'Z jakiego kraju pochodził papież Benedykt XVI (Joseph Ratzinger)?',
      answer: 'z Niemiec',
      aliases: ['Niemcy', 'Niemiec', 'z RFN']
    }
  ],
  [
    4043,
    {
      question: 'Kto pełnił funkcję prezydenta FIFA w latach 1998–2015?',
      answer: 'Joseph Blatter',
      aliases: ['Sepp Blatter', 'Blatter']
    }
  ],
  [
    4144,
    {
      question: 'Kto był selekcjonerem piłkarskiej reprezentacji Polski w latach 2012–2013?',
      answer: 'Waldemar Fornalik',
      aliases: ['Fornalik']
    }
  ],
  [
    4210,
    {
      question: 'Kto był selekcjonerem reprezentacji Polski w piłce ręcznej mężczyzn w latach 2004–2012?',
      answer: 'Bogdan Wenta',
      aliases: ['Wenta']
    }
  ],
  [
    202,
    {
      question: 'Jaką funkcję w Telewizji Polskiej pełnił w latach 2005–2009 Robert Korzeniowski?',
      answer: 'dyrektor sportowy TVP',
      aliases: ['dyrektor sportowy', 'dyrektor redakcji sportowej', 'szef sportu w TVP']
    }
  ],
  [
    875,
    {
      question: 'Ile planet znajduje się w Układzie Słonecznym od czasu reklasyfikacji Plutona w 2006 roku?',
      answer: 'osiem',
      aliases: ['8', '8 planet']
    }
  ],
  [
    916,
    {
      question: 'Jak nazywała się narodowa waluta Litwy przed przyjęciem euro w 2015 roku?',
      answer: 'lit',
      aliases: ['lity']
    }
  ],
  [
    4963,
    {
      question: 'Jaki jest najwyższy nominał polskich banknotów obiegowych z wizerunkiem Jana III Sobieskiego, wprowadzony w 2017 roku?',
      answer: '500 zł',
      aliases: ['500', '500 złotych', 'pięćset złotych']
    }
  ],
  [
    282,
    {
      question: 'W mitologii Odyn (Odin) jest najwyższym bogiem jakiego panteonu?',
      answer: 'nordyckiego',
      aliases: ['nordycki', 'skandynawski', 'germański', 'mitologii nordyckiej']
    }
  ],
  [
    319,
    {
      question: 'Jaka jest największa gorąca pustynia piaszczysto-żwirowa na Ziemi?',
      answer: 'Sahara',
      aliases: ['pustynia Sahara']
    }
  ],
  [
    385,
    {
      question: 'Paź królowej to piękny i duży krajowy owad będący:',
      answer: 'motylem',
      aliases: ['motyl', 'motyl dzienny']
    }
  ],
  [
    393,
    {
      question: 'Który potężny gatunek drzewa liściastego tradycyjnie nazywany jest królem polskich lasów?',
      answer: 'dąb',
      aliases: ['dąb szypułkowy', 'deby']
    }
  ],
  [
    406,
    {
      question: 'Jak nazywa się największy i najmasywniejszy wąż Ameryki Południowej, żyjący w dorzeczu Amazonki?',
      answer: 'anakonda',
      aliases: ['anakonda zielona']
    }
  ],
  [
    422,
    {
      question: 'Jak nazywa się największy lądowy ssak Ameryki Północnej?',
      answer: 'bizon',
      aliases: ['bizon amerykański']
    }
  ],
  [
    760,
    {
      question: 'Jak nazywa się największy chrząszcz wodny występujący w Polsce?',
      answer: 'kałużnica czarnozielona',
      aliases: ['kałużnica', 'pływak żółtobrzeżek']
    }
  ],
  [
    8591,
    {
      question: 'Ile pełnometrażowych filmów kinowych liczy saga o przygodach Indiany Jonesa z Harrisonem Fordem (po premierze w 2023 r.)?',
      answer: 'pięć',
      aliases: ['5', 'pięć części', '5 filmów']
    }
  ],
  [
    1082,
    {
      question: 'Co w dosłownym tłumaczeniu oznacza nazwa japońskiej sekty Aum Shinrikyo?',
      answer: 'Najwyższa Prawda',
      aliases: ['nauka o najwyższej prawdzie']
    }
  ]
]);

// Filter out removed items and apply updates
const filtered = [];
let updatedCount = 0;
let removedCount = 0;

for (const q of questions) {
  if (idsToRemove.has(q.id)) {
    removedCount++;
    continue;
  }

  if (updates.has(q.id)) {
    const patch = updates.get(q.id);
    q.question = patch.question;
    q.answer = patch.answer;
    q.aliases = patch.aliases;
    updatedCount++;
  }

  filtered.push(q);
}

console.log(`Updated questions: ${updatedCount}`);
console.log(`Removed questions: ${removedCount}`);
console.log(`New total count: ${filtered.length}`);

// Write back updated questions.json
fs.writeFileSync(questionsPath, JSON.stringify(filtered, null, 2), 'utf8');

// Update categories counts in categories.json
const catCounts = {};
for (const q of filtered) {
  catCounts[q.category] = (catCounts[q.category] || 0) + 1;
}

const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
for (const cat of categories) {
  cat.count = catCounts[cat.id] || 0;
}
fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf8');

console.log('Categories counts updated successfully.');
