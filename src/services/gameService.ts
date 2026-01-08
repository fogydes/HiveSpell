// Raw text data from files
const BABY_TEXT = `Air
Heir
Baby
Bad
Bag
Ball
Bawl
Bar
Bat
Bee
Be
Best
Big
Bird
Blue
Blew
Book
Bug
Bus
Cake
Car
Cat
Cool
Cry
Cup
Dad
Dog
Duck
Eat
Elf
End
Eye
Aye
Face
Fire
Fish
Phish
Foot
Gold
Hand
Kiss
Milk
Mix
Mom
Moon
Mug
Noob
Newb
Pie
Pi
Pink
Rain
Reign
Rat
Red
Read
Ruby
Run
Sit
Size
Sighs
Snow
Soda
Star
Suck
Sun
Son
Tag
Tank
Tap
Town
Tree
Water
Wind
Word
Zoo`;

const CAKEWALK_TEXT = `Absorb
Angel
Ash
Bingo
Black
Boss
Brain
Burger
Burial
Cabin
Circle
Clever
Cliff
Clutch
Comply
Convey
Crowd
Dairy
Defy
Demon
Echo
Emoji
Erupt
Exert
Exile
Film
Filter
Flower
Flour
Foggy
Forbid
Gender
Ghost
Giant
Greedy
Green
Grub
Hello
Hotel
House
Human
Hungry
Ink
Intent
Iron
Irony
Land
Length
Margin
Melt
Meow
Monk
Noble
Nobel
Orange
Pasta
Pear
Pair
Power
Prank
Pray
Prey
Proof
Quack
Quill
Rally
Random
Reply
Robust
Rot
Wrought
Shake
Shark
Sigh
Psi
Sock
State
Stew
Still
Stumble
Trauma
Twist
Update
Vein
Vain
Walk
Way
Weigh
White
Workout
Wrist`;

const LEARNER_TEXT = `Abolish
Absence
Abstract
Agaric
Agnostic
Akin
Albeit
Alliance
Alphabet
Anatomical
Answer
Appetite
Armor
Armour
Atone
Automatic
Await
Bamboo
Bayonet
Betray
Biography
Bizarre
Breakthrough
Broccoli
Catalog
Catalogue
Center
Centre
Chicken
Chronic
Church
Congratulate
Cooking
Curious
Damage
Debris
Diesel
Dilate
Dolphin
Enact
Excellent
Familiar
Firefighter
Flavor
Flavour
Formidable
Frolic
Furious
Gallant
Gradual
Guideline
Harbor
Harbour
Heresy
Immobilize
Immobilise
Integrity
Ionize
Ionise
Lactose
Lather
Leafy
Liable
Lightning
Magnificent
Meditate
Normal
Oasis
Obesity
Offender
Overdue
Overdo
Paradox
Password
Pigeon
Pidgin
Plethora
Powder
Probably
Pulsar
Pumpkin
Pursuit
Queen
Recipient
Refrain
Refugee
Remarkable
Rye
Wry
Scrutiny
Secret
Seldom
Semicircle
Sigma
Sleigh
Slay
Sniffle
Special
Spooky
Strategic
Subsidy
Swamp
Syntax
Tangerine
Telepathy
Thesis
Tremendous
Twenty
Uncomfortable
Vague
Villain
Voluntary
Walnut
Warrior
Window
Zombie`;

const INTERMEDIATE_TEXT = `Abditive
Abdomen
Abhorrent
Abscond
Accomplishment
Accumulation
Adolescent
Adversity
Aerodynamic
Agriculture
Apostrophe
Articulate
Asphyxiation
Aspiration
Assumption
Asthma
Atmospheric
Beneficiary
Benevolence
Blizzard
Bronchitis
Brusque
Calibration
Candlelight
Caustic
Champagne
Charisma
Chlorophyll
Christmas
Cognitive
Colonel
Kernel
Combustible
Commodity
Concentration
Consumption
Contour
Controversial
Cuisine
Dauntless
Deployment
Derogatory
Detrimental
Diplomatic
Disappointment
Disconsolate
Division
Doctrine
Elaborate
Embarrassment
Embassy
Enchantment
Encore
Endeavor
Endeavour
Epiphany
Epsilon
Erratic
Euphoria
Exaggerate
Excalibur
Exorcism
Expenditure
Exponential
Extravagant
Fantasy
Favorable
Favourable
Featherweight
Fictitious
Fjord
Flamboyant
Fluorescent
Forthcoming
Frostbite
Fruition
Gastronomic
Gazebo
Gibberish
Gingerbread
Glacier
Gratitude
Gravestone
Hailstone
Heritage
Hexagonal
Hibernation
Hornswoggle
Hourglass
Humanitarian
Hypothesis
Ideological
Idiom
Imminent
Imprisonment
Independence
Indifference
Inhabitant
Intermediate
Intermission
Juxtaposition
Kangaroo
Legendary
Limousine
Livery
Mathematician
Melancholy
Metabolism
Methodology
Microorganism
Misconception
Mistletoe
Multiplication
Myopic
Nebulous
Necromancer
Negotiation
Neighboring
Neighbouring
Nonplussed
Notorious
Obituary
Oblivious
Opaque
Optimism
Palatine
Pantograph
Parallel
Participation
Passionate
Peppermint
Periodically
Personnel
Pestilence
Photographer
Pomegranate
Portfolio
Practitioner
Predominantly
Present
Problematic
Proclamation
Procrastinate
Pronunciation
Propaganda
Protocol
Pygmy
Ravenous
Recession
Reincarnation
Reliability
Residential
Resilience
Resurrection
Revelation
Rhythm
Ricochet
Sabotage
Sachet
Sashay
Sapphire
Scholarship
Sentimental
Separation
Shareholder
Significance
Skeleton
Snowflake
Solidarity
Spokesperson
Steadfast
Stereotype
Supposedly
Surrogate
Surveillance
Susceptible
Syllable
Symmetrical
Systematic
Technological
Thesaurus
Transaction
Translucent
Transparency
Transportation
Understand
Unprecedented
Validity
Venerate
Violation
Vulnerability
Wednesday
Wholeheartedly
Worthwhile`;

const HEATED_TEXT = `Abacaxi
Abasia
Accommodate
Acculturate
Aegis
Aforementioned
Aggrandize
Aggrandise
Agoraphobia
Agoraphobic
Ambidextrous
Ambiguous
Anaphylactic
Anemone
Anisosquaric
Apocryphal
Apothecary
Asphyxiation
Astigmatism
Asunder
Ataraxy
Attorney
Bandeau
Belvedere
Betwixt
Blatherskite
Bodacious
Brucellosis
Bucolic
Cacophony
Calamitous
Calumny
Capoeira
Capricious
Captious
Cerulean
Charcuterie
Chauffeur
Chronological
Cinematographer
Clandestine
Coalescence
Codicil
Colloquialism
Comeuppance
Commodore
Compunction
Consanguine
Consummate
Correspondence
Counterintuitive
Culvert
Cyrillic
Defenestration
Deleterious
Depilatory
Diminution
Discombobulate
Dodecahedron
Eloquent
Elysian
Elision
Epitome
Extraterrestrial
Facsimile
Fastidious
Fissiparous
Flummox
Fuchsia
Gentrification
Glaucomatous
Glockenspiel
Gobbledygook
Gobbledegook
Grandiloquent
Handkerchief
Harpsichord
Hemoglobin
Haemoglobin
Heterozygous
Hierarchy
Homeopathy
Homoeopathy
Homogeneous
Horticulturist
Hypermetropia
Iconoclast
Incandescent
Inchoate
Incoagulable
Indefatigable
Ingenious
Insinuate
Isometropia
Isthmus
Kaleidoscope
Languid
Legislation
Lexicography
Liaison
Lugubrious
Lymphangiography
Macabre
Magniloquent
Malapropism
Martyrdom
Mellifluous
Menagerie
Microminiaturisation
Milieu
Miniscule
Minuscule
Miscellaneous
Monochromatic
Monosyllabic
Multidimensionality
Municipal
Myriad
Narcissistic
Nauseous
Neuroplasticity
Nocturn
Nocturne
Nomenclature
Obfuscation
Paradigm
Parliamentary
Paroxysm
Pecuniary
Pessimistic
Phantasmagoria
Pharaoh
Farrow
Phenomenon
Phlegm
Photogeochemistry
Pirouette
Pneumatic
Polemic
Polychromatic
Polydactyly
Predecessor
Prestigious
Psychological
Puerile
Pugnacious
Querimony
Quixotry
Rambunctious
Rehabilitation
Reminiscence
Rendezvous
Sagacious
Sanguine
Sarcophagus
Scintillate
Semaphore
Sequacious
Sequoia
Silhouette
Simultaneous
Sovereignty
Subpoena
Subterranean
Supercentenarian
Supersede
Supercede
Syllepsis
Symbiosis
Syzygy
Tempestuous
Tetraphobia
Therapeutic
Thermionic
Thermoluminescence
Triphosphate
Ubiquitous
Uncharacteristic
Unintelligible
Verbatim
Vexatious
Vignette
Xenogeneic
Zephyr
Zygote`;

const GENIUS_TEXT = `Abdominothoracic
Absquatulate
Acetaminophen
Achromatophil
Achromatophilia
Acquiesce
Allotransplantation
Anachronistic
Aneurysmorrhaphy
Antediluvian
Arthroereisis
Ascosporogenous
Baccalaureate
Batrachophobia
Bogolanfini
Borborygmus
Bougainvillea
Bourgeoisie
Buckminsterfullerene
Bureaucracy
Chronopsychophysiology
Clinicoechocardiographic
Compartmentalization
-sation
Contradistinguish
Countermajoritarianism
Craniosynostosis
Cryptoendolithic
Dendrochronology
Deoxyribonucleic
Dichotomization
Eclaircissement
Effervescent
Electrotelethermometer
Entrepreneur
Ethnomethodology
Ethnopsychopharmacology
Flibbertigibbet
Fossiliferous
Frontoethmoidectomy
Geitonogamy
Geochronostratigraphical
Glyceraldehyde
Goniosynechialysis
Gubernatorial
Hemispherectomy
Hieroglyphics
Hypercholesterolemia
Hypergammaglobulinemia
Hypergonadotropic
Hyperpolysyllabic
Hypoparathyroidism
Incomprehensibility
Infinitesimal
Infundibulum
Institutionalization
Jurisprudence
Labyrinthine
Lepidopterology
Machiavellian
Mechanotransduction
Metonymic
Morphodifferentiation
Necrobiosislipoidica
Neuropsychological
Oligonucleotide
Onomatopoeia
Orthogeosyncline
Panproctocolectomy
Parallelogrammatic
Paraphernalia
Perspicacious
Photoreconnaissance
Plasmodiumfalciparum
Plenipotentiary
Portmanteau
Prestidigitation
Proceleusmatic
Prognostication
Pseudohyperaldosteronism
Pseudoparallelodromous
Pseudoriemannian
Psychotomimetic
Pulchritudinous
Pusillanimous
Quasiautobiographical
Quasquicentennial
Quindecasyllabic
Quoddamodotative
Radioallergosorbent
Radiometeorograph
Rhinorrhagia
Serendipity
Sesquipedalian
Soliloquy
Spectrophotometer
Subcompartmentalization
Subdermatoglyphic
Supererogatory
Superferromagnetism
Susurration
Temporomandibular
Thalassophobia
Thermochromatography
Tintinnabulation
Transinstitutionalization
Trinitrotoluene
Utilitarianism
Verisimilitude
Worcestershire
Xiphiplastron
Xylotypographic`;

const SUPER_HARD_TEXT = `Acetylglucocoroglaucigenin
Adrenocorticotropin
-trophin
Anthropomorphization
-sation
Antidisestablishmentarianism
Antixerophthalmic
Autothaumaturgist
Bourgeoisification
Bromochlorodifluoromethane
Canaliculodacryocystorhinostomy
Chargoggagoggmanchauggagoggchaubunagungamaugg
Cholangiocholecystocholedochectomy
Cholangiopancreatography
Chondromyxohemangioendotheliosarcoma
Convolvulaceous
Corticopontocerebellar
Counterimmunoelectrophoresis
Dehydrothiotoluidine
Dermatofibrosarcomaprotuberans
Dextrodeorsumversion
Dichlorodiphenyltrichloroethane
Diisopropylfluorophosphate
Eellogofusciouhipoppokunurious
Encephalocraniocutaneouslipomatosis
Erythrocytapheresis
Ferriprotoporphyrin
Floccinaucinihilipilification
Fluorotetraferriphlogopite
Gastroenterologist
Gegenstandstheorie
Hematospectrophotometrically
Haematospectrophotometrically
Hexakosioihexekontahexaphobia
Hippopotomonstrosesquipedaliophobia
-quippedaliophobia
Honorificabilitudinity
Honourificabilitudinity
Hypothalamicpituitaryadrenocortical
Immunoelectrochemiluminescence
Inositolphosphorylceramide
Laparohysterosalpingooophorectomy
Laryngotracheobronchitis
Loncastuximabtesirine
Lymphangioleiomyomatosis
Micropachycephalosaurus
Neohesperidindihydrochalcone
Nonanonacontanonactanonaliagon
Nucleotidylexotransferase
Otorhinolaryngological
Photoplethysmography
Pneumoencephalography
Pneumonoultramicroscopicsilicovolcanoconiosis
Polyphiloprogenitive
Pseudopseudohypoparathyroidism
Pseudorhombicuboctahedron
Psychoneuroendocrinological
Psychoneuroimmunology
Psychophysicotherapeutics
Pyrrolizidinealkaloidosis
Ribulosebisphosphatecarboxylaseoxygenase
Sclerectoiridectomy
Spectrophotofluorometry
Sphenopalatineganglioneuralgia
Sphygmomanometer
Stereoelectroencephalography
Supercalifragilisticexpialidocious
Thyroparathyroidectomy
Tonsillopharyngitis
Uvulopalatopharyngoplasty
Ventriculocisternostomy`;

const parseWords = (text: string) => text.split('\n').map(w => w.trim()).filter(w => w.length > 0 && !w.startsWith('-'));

const baby = parseWords(BABY_TEXT);
const cakewalk = parseWords(CAKEWALK_TEXT);
const learner = parseWords(LEARNER_TEXT);
const intermediate = parseWords(INTERMEDIATE_TEXT);
const heated = parseWords(HEATED_TEXT);
const genius = parseWords(GENIUS_TEXT);
// SWAP: Polymath is now the hard specific list
const polymath = parseWords(SUPER_HARD_TEXT);
// SWAP: Omniscient is now the combination of all
const omniscient = [...baby, ...cakewalk, ...learner, ...intermediate, ...heated, ...genius, ...polymath];

// ORDERED MODES for progression - SWAPPED
export const MODE_ORDER = ['baby', 'cakewalk', 'learner', 'intermediate', 'heated', 'genius', 'polymath', 'omniscient'];

export const wordBank: Record<string, string[]> = {
  baby,
  cakewalk,
  learner,
  intermediate,
  heated,
  genius,
  polymath, // Swapped
  omniscient, // Swapped
};

const HOMOPHONES: Record<string, string[]> = {
  "air": ["heir"], "heir": ["air"],
  "ball": ["bawl"], "bawl": ["ball"],
  "be": ["bee"], "bee": ["be"],
  "blue": ["blew"], "blew": ["blue"],
  "eye": ["aye", "i"], "aye": ["eye", "i"],
  "flour": ["flower"], "flower": ["flour"],
  "know": ["no"], "no": ["know"],
  "knight": ["night"], "night": ["knight"],
  "mail": ["male"], "male": ["mail"],
  "pair": ["pear", "pare"], "pear": ["pair", "pare"], "pare": ["pair", "pear"],
  "peace": ["piece"], "piece": ["peace"],
  "plain": ["plane"], "plane": ["plain"],
  "rain": ["reign", "rein"], "reign": ["rain", "rein"], "rein": ["rain", "reign"],
  "read": ["red"], "red": ["read"],
  "right": ["write", "rite"], "write": ["right", "rite"],
  "sea": ["see"], "see": ["sea"],
  "son": ["sun"], "sun": ["son"],
  "tail": ["tale"], "tale": ["tail"],
  "to": ["too", "two"], "too": ["to", "two"], "two": ["to", "too"],
  "way": ["weigh"], "weigh": ["way"],
  "week": ["weak"], "weak": ["week"],
  "phish": ["fish"], "fish": ["phish"],
  "newb": ["noob"], "noob": ["newb"],
  "sighs": ["size"], "size": ["sighs"],
  "psi": ["sigh"], "sigh": ["psi"],
  "noble": ["nobel"], "nobel": ["noble"],
  "wrought": ["rot"], "rot": ["wrought"],
  "pharaoh": ["farrow"], "farrow": ["pharaoh"],
  "colonel": ["kernel"], "kernel": ["colonel"],
  "armor": ["armour"], "armour": ["armor"],
  "center": ["centre"], "centre": ["center"],
  "color": ["colour"], "colour": ["color"],
  "flavor": ["flavour"], "flavour": ["flavor"],
  "harbor": ["harbour"], "harbour": ["harbor"],
  "neighbor": ["neighbour"], "neighbour": ["neighbor"],
  "honor": ["honour"], "honour": ["honor"],
};

// Helper to normalize -ize/-ise and -yze/-yse and -our/-or suffixes
const normalizeSuffix = (word: string) => {
  return word.toLowerCase()
    .replace(/isation/g, 'ization')
    .replace(/ise$/g, 'ize')
    .replace(/yse$/g, 'yze')
    .replace(/our/g, 'or') 
    .replace(/re$/g, 'er'); 
};

export const checkAnswer = (target: string, input: string): boolean => {
  const normTarget = normalizeSuffix(target);
  const normInput = normalizeSuffix(input);

  if (normTarget === normInput) return true;

  const lowerTarget = target.toLowerCase();
  const lowerInput = input.toLowerCase();

  if (HOMOPHONES[lowerTarget]) {
    if (HOMOPHONES[lowerTarget].includes(lowerInput)) return true;
    const matches = HOMOPHONES[lowerTarget].some(h => normalizeSuffix(h) === normInput);
    if (matches) return true;
  }

  return false;
};

export const fetchDefinition = async (word: string): Promise<string> => {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) throw new Error("No def");
    const data = await res.json();
    return data[0]?.meanings[0]?.definitions[0]?.definition || "Listen carefully to the pronunciation.";
  } catch (e) {
    return "Listen carefully to the pronunciation.";
  }
};

export const getTitle = (corrects: number, wins: number): string => {
  if (corrects >= 50000) return 'Queen Bee';
  if (corrects >= 10000) return 'Hive Master';
  if (wins >= 1000) return 'Hive Champion';
  if (corrects >= 1000 && wins >= 100) return 'Busy Bee';
  return 'Newbee';
};

export const speak = async (word: string, volume: number = 1.0): Promise<void> => {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', {
      method: 'POST',
      headers: {
        "xi-api-key": "sk_229d95d9dbf414c1b6455dcd5fd20d8aaa18b14ccf789344",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: word,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      throw new Error(`TTS Failed: ${response.status}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    
    // Return a promise that resolves when playback finishes
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      audio.volume = volume;
      audio.onended = () => {
        resolve();
      };
      // Handle errors during playback just in case
      audio.onerror = () => {
        resolve();
      }
      audio.play().catch(e => {
         console.warn("Autoplay blocked or error", e);
         resolve();
      });
    });

  } catch (error) {
    console.error("Error playing audio:", error);
    // Fallback to basic TTS
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.volume = volume;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
    });
  }
};