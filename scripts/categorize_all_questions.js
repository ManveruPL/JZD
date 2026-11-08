const fs = require('fs');

const categoryRules = [
  // --- JĘZYK POLSKI ---
  {
    category: 'jezyk-polski',
    weight: 22,
    patterns: [
      /\b(przysłowi\w*|przysłowiu|przysłowiem|dokończ przysłowie|powiedzeni\w*|frazeologizm\w*|powiedzonk\w*)\b/i,
      /\b(w zdaniu|który wyraz jest|część mowy|częścią mowy|rzeczownik\w*|przymiotnik\w*|czasownik\w*|przysłówek\w*|liczebnik\w*|zaimek\w*|spójnik\w*|przyimek\w*)\b/i,
      /\b(co oznacza słowo|co znaczy słowo|co oznacza termin|co oznacza wyrażenie|znaczenie słowa|jak brzmi dokończenie|jak z greckiego|co z greckiego|co z łaciny|z łaciny oznacza|z języka greckiego|z języka łacińskiego|z języka francuskiego|z języka niemieckiego|z języka angielskiego)\b/i,
      /\b(odmienia się przez przypadki|w którym przypadku|mianownik\w*|dopełniacz\w*|celownik\w*|biernik\w*|narzędnik\w*|miejscownik\w*|wołacz\w*|deklinacj\w*|koniugacj\w*)\b/i,
      /\b(ortografi\w*|jak się pisze|pisownia|piszemy razem|piszemy osobno|z wielkiej litery|z małej litery|synonim\w*|antonim\w*|homonim\w*)\b/i,
      /\b(litera alfabetu|litera w alfabecie|samogłosk\w*|spółgłosk\w*|dwuznak\w*|akcent\w*|archaizm\w*|neologizm\w*)\b/i,
      /\b(nie w ciemię bity|zjeść beczkę soli|nie od razu kraków|niedaleko pada jabłko|kłamstwo ma krótkie nogi|oliwa sprawiedliwa)\b/i
    ]
  },

  // --- FILM I SERIALE ---
  {
    category: 'film',
    weight: 20,
    patterns: [
      /\b(w jakim filmie|w którym filmie|kto wyreżyserował|kto zagrał|kto wcielił się|kto grał|kto gra postać|kto odtwarzał rolę|reżyserem filmu|film fabularny|film animowany)\b/i,
      /\b(reżyser\w*|aktor\w*|aktork\w*|kinematografi\w*|dubbing\w*|kinie|hollywood|camerimage)\b/i,
      /\b(oscar\w*|oskar\w*|złota palma|złoty glob|złote lwy)\b/i,
      /\b(serial\w*|serialu|telenowel\w*|sitcom\w*|odcinek serialu|w serialu)\b/i,
      /\b(czterej pancerni|czterech pancernych|stawka większa niż życie|czterdziestolatek|maliniak|sami swoi|rejs|seksemisja|kiler|m jak miłość|ojciec mateusz|ranczo)\b/i,
      /\b(wajd\w*|polańsk\w*|kieślowsk\w*|agnieszka holland|spielberg|tarantino|zanussi|barej\w*|pasikowsk\w*|machulsk\w*)\b/i,
      /\b(james bond|007|gwiezdne wojny|star wars|władca pierścieni|ojciec chrzestny|harry potter)\b/i
    ]
  },

  // --- SZTUKA ---
  {
    category: 'sztuka',
    weight: 20,
    patterns: [
      /\b(kto namalował|twórcą obrazu|autorem obrazu|obrazu namalowanego|pędzla jakiego malarza|namalowany przez)\b/i,
      /\b(obraz\s+„[^”]+”|fresk\s+„[^”]+”|rzeźba\s+„[^”]+”|obrazie\s+„[^”]+”)\b/i,
      /\b(malarz\w*|malark\w*|malarstw\w*|fresk\w*|płótno|akwarel\w*|portret\w*|pejzaż\w*|martwa natura)\b/i,
      /\b(rzeźbiarz\w*|rzeźb\w*|płaskorzeźb\w*|posąg\w*|statu\w*|popiersi\w*)\b/i,
      /\b(architektur\w*|architekt\w*|styl gotyck\w*|styl barokow\w*|styl renesansow\w*|styl romańsk\w*|secesj\w*|klasycyzm\w*|katedr\w*|bazylik\w*|ołtarz mariacki)\b/i,
      /\b(luwr\w*|muzeum narodow\w*|ermitaż\w*|prado|galeria uffizi|wit stwosz|nagroda pritzkera)\b/i,
      /\b(matejko|matejki|da vinci|leonardo da vinci|picasso|monet|van gogh|rembrandt|rafael|michał anioł|michelangelo|chełmońsk\w*|malczewsk\w*|witkacy|witkac\w*|gierymsk\w*|rubens\w*|kossak\w*)\b/i
    ]
  },

  // --- MUZYKA ---
  {
    category: 'muzyka',
    weight: 20,
    patterns: [
      /\b(kompozytor\w*|utwór muzyczn\w*|symfoni\w*|oper\w*|operetk\w*|filharmoni\w*|orkiestr\w*)\b/i,
      /\b(instrument\w*|fortepian\w*|pianin\w*|skrzypc\w*|gitar\w*|trąbk\w*|flet\w*|perkusj\w*|wiolonczel\w*|klarnet\w*|obój|harf\w*|akordeon\w*|waltorni\w*|puzon\w*|saksofon\w*)\b/i,
      /\b(chopin\w*|szopen\w*|moniuszk\w*|mozart\w*|beethoven\w*|bach\w*|vivaldi\w*|czajkowsk\w*|wagner\w*|verdi\w*|brahms\w*|schubert\w*|haydn\w*|pendereck\w*|lutosławsk\w*)\b/i,
      /\b(piosenk\w*|piosenkarz\w*|piosenkark\w*|wokalist\w*|wokalistk\w*|zespół muzyczn\w*|śpiewa\w*|zaśpiewał\w*|hymn\w*|eurowizj\w*)\b/i,
      /\b(kwartet\w*|kwarteci\w*|kwintet\w*|oktaw\w*|tonacj\w*|akord\w*|nut[yaeę]|nutami|nutach|metronom\w*|sopran\w*|altem|altówka\w*|altowy|tenor\w*|baryton\w*|basist\w*|gitara basowa)\b/i,
      /\b(rock\w*|jazz\w*|blues\w*|heavy metal|disco polo|hip-hop|festiwal w opolu|festiwal w sopocie)\b/i
    ]
  },

  // --- SPORT ---
  {
    category: 'sport',
    weight: 20,
    patterns: [
      /\b(dyscyplin\w* sport\w*|jaka to dyscyplina|w jakiej dyscyplinie|jaki sport|jakim sportem|jaką dyscyplinę)\b/i,
      /\b(igrzysk\w* olimpijsk\w*|olimpiad\w*|medal olimpijsk\w*|złoty medal|mistrzostw\w* świata|mistrzostw\w* europy|puchar świata)\b/i,
      /\b(piłk\w* nożn\w*|futbol\w*|koszykówk\w*|siatkówk\w*|piłk\w* ręczn\w*|hokej\w*|tenis\w*|kolarstw\w*|boks\w*|judo|lekkoatletyk\w*|maraton\w*|szach\w*)\b/i,
      /\b(skok\w* narciarsk\w*|narciarstw\w*|biathlon\w*|łyżwiarstw\w*|pływani\w*|wioślarstw\w*|kajakarstw\w*|żeglarstw\w*|rajd\w*|formuła 1|f1)\b/i,
      /\b(stadion\w*|mecz\w*|turniej\w*|zawodnik\w*|reprezentacj\w*|bramk\w*|gol\w*|spalony|rzut karny|serw|gem|set|dogrywka|nokaut|ring)\b/i,
      /\b(małysz\w*|stoch\w*|żyła|kubacki|lewandowsk\w*|świątek|radwańsk\w*|korzeniowsk\w*|szewińsk\w*|kucharsk\w*|boniek|dudek|kusznierewicz)\b/i
    ]
  },

  // --- LITERATURA ---
  {
    category: 'literatura',
    weight: 18,
    patterns: [
      /\b(kto napisał|kto jest autorem powieści|kto jest autorem wiersza|kto jest autorem książki|kto jest autorem dramatu|kto jest autorem komedii|kto jest autorem tragedii|czyjego autorstwa jest to utwór)\b/i,
      /\b(powieść\w*|powieści\w*|wiersz\w*|poemat\w*|nowel\w*|ballad\w*|fraszk\w*|treny|epopej\w*|dramat\w*|baśń|baśnie|bajk\w*|lektura|lekturze)\b/i,
      /\b(pisarz\w*|poet\w*|poetk\w*|literack\w*|literatur\w*|nobel z literatury|nobla w dziedzinie literatury)\b/i,
      /\b(pan tadeusz\w*|lalk\w*|quovadis|quo vadis|dziad\w*|kordian\w*|wesele|krzyżac\w*|ogniomistrz kaleń|potop|chłopi|przedwiośni\w*|ferdidurke|robinson crusoe|piętaszek)\b/i,
      /\b(mickiewicz\w*|słowack\w*|sienkiewicz\w*|prus\w*|reymont\w*|żeromsk\w*|miłosz\w*|szymborsk\w*|herbert\w*|kochanowsk\w*|ignacy krasick\w*|fredro|gombrowicz\w*|szekspir\w*|tołstoj\w*|dostojewsk\w*|homer\w*|dante\w*|goethe\w*|molier\w*|cervantes\w*)\b/i,
      /\b(bohater powieści|bohater literacki|protagonista|postać z powieści|klucznik horeszko|gerwazy|jacek soplica|zbyszko z bogdańca|skrzetuski|wołodyjowski|kmicic|staś i nel|tarkowski)\b/i
    ]
  },

  // --- MITOLOGIA I RELIGIA ---
  {
    category: 'mitologia-i-religia',
    weight: 18,
    patterns: [
      /\b(mitologi\w*|mit greck\w*|mit rzymsk\w*|mitologiczn\w*|mitu o)\b/i,
      /\b(zeus\w*|herakles\w*|herkules\w*|afrodyt\w*|apoll\w*|ares\w*|hades\w*|posejdon\w*|hermes\w*|dedal\w*|ikar\w*|prometeusz\w*|dionizos\w*|kronos\w*|hefajstos\w*|olimp\w*|tartar\w*|styks\w*|cerber\w*)\b/i,
      /\b(bóg greck\w*|bogini greck\w*|bóg rzymsk\w*|bogini rzymsk\w*|bóstwo\w*|bóstwa|panteon\w*|odyn\w*|thor\w*|loki\w*)\b/i,
      /\b(bibli\w*|biblijn\w*|pismo święte|stary testament|nowy testament|ewangeli\w*|ewangelist\w*|apostoł\w*|jezus\w*|chrystus\w*|maryj\w*|mojżesz\w*|abraham\w*|noe\w*|arka noego|synaj)\b/i,
      /\b(kościół|kościoła|papież\w*|watykan\w*|biskup\w*|kardynał\w*|zakon\w*|klasztor\w*|mnich\w*|franciszkan\w*|jezuic\w*|benedyktyn\w*)\b/i,
      /\b(religi\w*|chrześcijaństw\w*|katolicyzm\w*|protestantyzm\w*|prawosławi\w*|judaizm\w*|islam\w*|muzułman\w*|koran\w*|buddyzm\w*|hinduizm\w*|tora|synagog\w*|meczet\w*|jarmułk\w*|kipa|menora|szabat)\b/i
    ]
  },

  // --- MOTORYZACJA I TRANSPORT ---
  {
    category: 'motoryzacja',
    weight: 17,
    patterns: [
      /\b(samochód\w*|samochod\w*|pojazd\w*|silnik\w*|marka samochod\w*|koncern samochod\w*|marki samochod\w*)\b/i,
      /\b(fiat\w*|ford\w*|mercedes\w*|bmw|audi|volkswagen\w*|renault|peugeot|citroen|opel|toyot\w*|honda|skoda|ferrari|porsche)\b/i,
      /\b(skrzynia biegów|sprzęgło|hamulec|opona|opony|felga|akumulator|paliwo|benzyna|olej napędowy|diesel)\b/i,
      /\b(pociąg\w*|kolej\w*|lokomotyw\w*|wagon\w*|statek\w*|okręt\w*|żaglowiec\w*|lotnisk\w*|samolot\w*|śmigłow\w*|boeing|airbus)\b/i
    ]
  },

  // --- STYL ŻYCIA (Kulinaria, Moda, Tradycje) ---
  {
    category: 'styl-zycia',
    weight: 16,
    patterns: [
      /\b(potraw\w*|dani\w*|kuchni\w*|kulinarn\w*|zup\w*|sos\w*|deser\w*|ciast\w*|ser\w*|chleb\w*|pieczyw\w*)\b/i,
      /\b(napój|napoju|herbat\w*|kaw\w*|win\w*|piw\w*|wódk\w*|alkohol\w*|koktajl\w*|likier\w*|nalewk\w*)\b/i,
      /\b(warzyw\w*|przypraw\w*|pieprz\w*|cynamon\w*|wanili\w*|czosnek|cebul\w*|ziemniak\w*|pomidor\w*)\b/i,
      /\b(ubiór|ubrani\w*|odzież\w*|strój|sukni\w*|kapelusz\w*|melonik|buty|but\w*|tkanin\w*|jedwab\w*|wełn\w*|bawełn\w*|fryzur\w*)\b/i,
      /\b(savoir-vivre|halloween|walentynk\w*|sylwester|nowy rok)\b/i
    ]
  },

  // --- SPOŁECZEŃSTWO I PRAWO ---
  {
    category: 'spoleczenstwo-i-prawo',
    weight: 15,
    patterns: [
      /\b(sejm\w*|senat\w*|parlament\w*|marszałek sejmu|marszałek senatu|konstytucj\w*|ustaw\w*|kodeks\w*|prawo\w*|prawn\w*|legislacj\w*)\b/i,
      /\b(trybunał konstytucyjn\w*|sąd najwyższ\w*|sąd okręgow\w*|sędzi\w*|prokurator\w*|adwokat\w*|radca prawny|kodeks karny|kodeks cywilny|prezes sądu)\b/i,
      /\b(unia europejsk\w*|parlament europejsk\w*|komisja europejsk\w*|traktat z maastricht|traktat lizbońsk\w*|strefa schengen|strefa euro)\b/i,
      /\b(nato|onz|organizacja narodów zjednoczonych|unesco|who|unicef|czerwony krzyż|rada bezpieczeństwa onz|nik|gus)\b/i,
      /\b(walut\w*|pieniądz\w*|złotówk\w*|banknot\w*|monet\w*|nbp|narodowy bank polski|mennic\w*|mincerz|inflacj\w*|podatek\w*|vat|budżet państwa)\b/i,
      /\b(wybory prezydenck\w*|wybory parlamentarn\w*|ordynacja wyborcz\w*|referendum|obywatel\w*|prawa człowieka|prawa obywatela|ochlokracja)\b/i
    ]
  },

  // --- GEOGRAFIA ---
  {
    category: 'geografia',
    weight: 14,
    patterns: [
      /\b(stolic\w*|stolicą jakiego|stolicą którego|stolica państwa|stolica kraju)\b/i,
      /\b(w którym państwie|w jakim państwie|w jakim kraju|przez jakie państwo|przez jaki kraj|na terenie jakiego państwa|leży na terenie|w którym mieście|w jakim mieście)\b/i,
      /\b(w którym państwie leży|w jakim państwie leży|gdzie leży|w jakim mieście leży|nad jaką rzeką leży|nad jakim morzem leży|nad jakim oceanem)\b/i,
      /\b(rzek\w*|jezior\w*|morz\w*|ocean\w*|zatok\w*|cieśnin\w*|kanał sueski|kanał panamski|wodospad\w*)\b/i,
      /\b(gór\w*|pasm\w* górsk\w*|szczyt\w*|łańcuch górsk\w*|dolin\w*|przełęcz\w*|wulkan\w*|pustyni\w*|oaz\w*)\b/i,
      /\b(wysp\w*|archipelag\w*|półwysp\w*|przylądek\w*|kontynent\w*|na którym kontynencie|krain\w* geograficzn\w*|województw\w*|powiat\w*)\b/i,
      /\b(zwrotnik\w*|równik\w*|południk\w*|szerokość geograficzna|długość geograficzna|biegun północny|biegun południowy)\b/i,
      /\b(afryk\w*|azj\w*|ameryk\w*|europ\w*|antarktyd\w*|arktyk\w*|australi\w*|oceania)\b/i,
      /\b(tatr\w*|beskid\w*|bieszczad\w*|karpat\w*|sudet\w*|alp\w*|himalaj\w*|and\w*|kaukaz\w*|ural\w*|mont blanc|mount everest)\b/i,
      /\b(bałtyk\w*|śródziemn\w*|czarn\w*|czerwon\w*|północn\w*|atlantyck\w*|spokojn\w*|indyjsk\w*|wisł\w*|odr\w*|wart\w*|dunaj\w*|wołg\w*|tamiz\w*|sekwan\w*|ren\w*|nil\w*|amazonk\w*)\b/i,
      /\b(granicz\w* z polską|sąsiad\w* z polską|długość rzeki|wysokość szczytu|powierzchnia państwa|największe jezioro|najdłuższa rzeka|najwyższy szczyt)\b/i
    ]
  },

  // --- HISTORIA ---
  {
    category: 'historia',
    weight: 13,
    patterns: [
      /\b(w którym roku|w którym wieku|który wiek|w którym stuleciu|w jakich latach|kiedy miała miejsce|kiedy doszło do|kiedy wybuchł\w*)\b/i,
      /\b(bitw\w*|bitwa pod|wojn\w*|wojny światow\w*|kampani\w* wrześniow\w*|powstani\w* warszawsk\w*|powstani\w* listopadow\w*|powstani\w* styczniow\w*|powstani\w* kościuszkowsk\w*|powstani\w* wielkopolsk\w*)\b/i,
      /\b(król\w* polsk\w*|królow\w* polsk\w*|cesarz\w*|cesarstw\w*|car\w*|caryc\w*|faraon\w*|sułtan\w*|dynasti\w*|piast\w*|jagiellon\w*|waz\w*|burbon\w*|habsburg\w*|romanow\w*)\b/i,
      /\b(traktat\w*|pokój w\s+\w+|rozejm\w*|konfederacj\w* barsk\w*|konfederacj\w* targowick\w*|rozbiór\w* polski|unia lubelsk\w*|unia w krewie)\b/i,
      /\b(starożytn\w*|średniowiecz\w*|nowożytn\w*|antyk\w*|starożytny rzym|starożytna grecja|starożytny egipt|imperium rzymskie|republika rzymska|gladiator\w*|legion\w*)\b/i,
      /\b(piłsudsk\w*|kościuszko|poniatowsk\w*|chrobry|krzywousty|kazimierz wielki|jagiełło|sobieski|batory|napoleon\w*|hitler\w*|stalin\w*|churchill\w*|lenin\w*|fidel castro)\b/i,
      /\b(prl|prl-u|solidarność|stan wojenny|okrągły stół|pzpr|rząd na uchodźstwie|armii krajowej|bataliony chłopskie)\b/i,
      /\b(filozof\w*|filozofi\w*|sokrates\w*|platon\w*|arystoteles\w*|kant\w*|kartezjusz\w*|hedonizm\w*|stoicyzm\w*)\b/i,
      /\b(tytuł szlachecki|baron\w*|hrabi\w*|szlacht\w*|magnat\w*|dywizjon\w*|eskadr\w*|pułk\w*|batalion\w*|generał\w*|admirał\w*|aliant\w*)\b/i
    ]
  },

  // --- NAUKI ŚCISŁE I PRZYRODNICZE ---
  {
    category: 'nauki-scisle',
    weight: 12,
    patterns: [
      /\b(pierwiastek\w*|chemiczn\w*|symbol chemiczny|układ okresowy|kwas\w*|zasad\w*|atom\w*|cząsteczk\w*|związek chemiczny|reakcja chemiczna)\b/i,
      /\b(tlen\w*|wodór\w*|azot\w*|węgiel\w*|hel\w*|chlor\w*|sód\w*|potas\w*|żelaz\w*|miedź\w*|złot\w*|srebr\w*|ołów\w*|rtęć\w*|uran\w*)\b/i,
      /\b(fizyk\w*|siła grawitacji|grawitacj\w*|prędkość\w*|przyspieszeni\w*|masa\w*|ciężar\w*|energia\w*|prąd elektryczn\w*|napięcie\w*|opór\w*|promieniowani\w*|laser\w*|fala\w*|optyk\w*|soczewk\w*|termodynamik\w*|dźwięk\w*|ciecz\w*|powierzchnia cieczy|menisk)\b/i,
      /\b(matematyk\w*|geometri\w*|trójkąt\w*|kwadrat\w*|prostokąt\w*|okrąg\w*|koło\w*|promień\w*|średnic\w*|obwód\w*|pole powierzchni|kąt\w*|odcinek\w*|cięciwa|brył\w*|sześcian\w*|stożek\w*|walec\w*|kula\w*|równani\w*|ułamek\w*|procent\w*|liczba\w*|liczby pierwsze|układ współrzędnych|punkt zero)\b/i,
      /\b(planet\w*|układ słoneczn\w*|merkury|wenus|ziemia|mars\w*|jowisz\w*|saturn\w*|uran|neptun|pluton|słońc\w*|księżyc\w*|gwiazd\w*|galaktyk\w*|droga mleczna|astronomi\w*|teleskop\w*|orbita\w*|kometa\w*|asteroida\w*|meteoryt\w*|kopernik\w*|jan heweliusz|galileusz)\b/i,
      /\b(zwierzę\w*|zwierząt\w*|ssak\w*|ptak\w*|gad\w*|płaz\w*|ryb\w*|owad\w*|stawonóg\w*|pająk\w*|skorupiak\w*|mięczak\w*|bezkręgow\w*|drapieżnik\w*|gryzoń\w*)\b/i,
      /\b(roślin\w*|drzew\w*|krzew\w*|kwiat\w*|liść\w*|korzeń\w*|iglast\w*|liściast\w*|botanik\w*|zoolog\w*|biolog\w*|genetyk\w*|dna|chromosom\w*|komórk\w*|tkank\w*|kaktus\w*|szalej\w*|trucizn\w*|cykuta)\b/i,
      /\b(organ\w*|narząd\w*|anatomia\w*|kości\w*|szkielet\w*|czaszka|kręgosłup\w*|mięsień\w*|serce\w*|płuco\w*|płuca\w*|mózg\w*|wątrob\w*|nerka\w*|nerki\w*|żołądek\w*|krew\w*|krwiobieg\w*|naczynia krwionośne|tętnica|żyła|skóra|oko\w*|ucho\w*|układ nerwowy|układ pokarmowy)\b/i,
      /\b(medycyn\w*|lekarz\w*|chorob\w*|wirus\w*|bakteri\w*|szczepionk\w*|antybiotyk\w*|witamina\w*|hormon\w*|objaw\w*|epidemi\w*|chirurg\w*|urządzenie medyczne)\b/i
    ]
  }
];

function classify(question, answer) {
  const text = `${question} ${answer}`;
  const scores = {};

  for (const rule of categoryRules) {
    let catScore = 0;
    for (const pat of rule.patterns) {
      const m = text.match(new RegExp(pat.source, pat.flags + 'g'));
      if (m) {
        catScore += m.length * rule.weight;
      }
    }
    if (catScore > 0) {
      scores[rule.category] = (scores[rule.category] || 0) + catScore;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 10) {
    return sorted[0][0];
  }
  return 'ciekawostki';
}

// Process data/questions.json
console.log('Loading data/questions.json...');
const allQuestions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

let reclassifiedClassic = 0;
let reclassifiedPoleval = 0;

const updatedQuestions = allQuestions.map(item => {
  let cat = item.category;

  // If from PolEval (wiedza-ogolna) -> classify!
  if (item.source && item.source.startsWith('poleval')) {
    cat = classify(item.question, item.answer);
    reclassifiedPoleval++;
  } else if (item.category === 'ciekawostki') {
    // For classic questions marked as generic 'ciekawostki', check if there is a strong match
    const newCat = classify(item.question, item.answer);
    if (newCat !== 'ciekawostki') {
      cat = newCat;
      reclassifiedClassic++;
    }
  }

  return {
    ...item,
    category: cat
  };
});

console.log(`Reclassified ${reclassifiedPoleval} PolEval questions.`);
console.log(`Refined ${reclassifiedClassic} classic 'ciekawostki' questions to more specific categories.`);

// Calculate final category distribution
const categoryStats = {};
updatedQuestions.forEach(q => {
  categoryStats[q.category] = (categoryStats[q.category] || 0) + 1;
});

console.log('\nFinal Total Category Distribution (11,052 questions):');
console.table(Object.entries(categoryStats).sort((a,b) => b[1] - a[1]));

// Save updated master dataset
fs.writeFileSync('data/questions.json', JSON.stringify(updatedQuestions, null, 2), 'utf8');
fs.writeFileSync('data/question.json', JSON.stringify(updatedQuestions, null, 2), 'utf8');

// Update data/questions_poleval.json and data/questions_classic.json
const polevalItems = updatedQuestions.filter(q => q.source && q.source.startsWith('poleval'));
const classicItems = updatedQuestions.filter(q => q.source === 'jzd-classic');
fs.writeFileSync('data/questions_poleval.json', JSON.stringify(polevalItems, null, 2), 'utf8');
fs.writeFileSync('data/questions_classic.json', JSON.stringify(classicItems, null, 2), 'utf8');

// Update categories metadata
const categoryNames = {
  'geografia': 'Geografia i Świat',
  'historia': 'Historia',
  'nauki-scisle': 'Nauki Ścisłe i Przyroda',
  'literatura': 'Literatura i Lektury',
  'film': 'Film i Seriale',
  'sport': 'Sport',
  'muzyka': 'Muzyka',
  'ciekawostki': 'Ciekawostki i Wiedza Ogólna',
  'mitologia-i-religia': 'Mitologia i Religia',
  'spoleczenstwo-i-prawo': 'Społeczeństwo i Prawo',
  'styl-zycia': 'Styl Życia i Kulinaria',
  'motoryzacja': 'Motoryzacja i Transport',
  'jezyk-polski': 'Język Polski i Przysłowia',
  'sztuka': 'Sztuka i Architektura',
  'wielka-brytania': 'Wiedza o Wielkiej Brytanii'
};

const categoriesMeta = Object.entries(categoryStats).map(([id, count]) => ({
  id,
  name: categoryNames[id] || id,
  count
})).sort((a, b) => b.count - a.count);

fs.writeFileSync('data/categories.json', JSON.stringify(categoriesMeta, null, 2), 'utf8');

console.log('Saved data/questions.json, data/questions_poleval.json, data/questions_classic.json, data/categories.json');
