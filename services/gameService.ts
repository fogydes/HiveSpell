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

// 1. BACKUP DICTIONARY FOR HARD WORDS
const LOCAL_DEFINITIONS: Record<string, string> = {
  "floccinaucinihilipilification": "The action or habit of estimating something as worthless.",
  "hippopotomonstrosesquipedaliophobia": "The fear of long words.",
  "pneumonoultramicroscopicsilicovolcanoconiosis": "A lung disease caused by inhaling very fine ash and sand dust.",
  "supercalifragilisticexpialidocious": "Extraordinarily good; wonderful.",
  "antidisestablishmentarianism": "Opposition to the disestablishment of the Church of England.",
  "pseudopseudohypoparathyroidism": "A mild form of inherited pseudohypoparathyroidism.",
  "honorificabilitudinitatibus": "The state of being able to achieve honours.",
  "honorificabilitudinity": "The state of being able to achieve honours.",
  "dichlorodiphenyltrichloroethane": "A colorless, tasteless, and almost odorless crystalline chemical compound (DDT).",
  "thyroparathyroidectomy": "Surgical removal of the thyroid and parathyroid glands.",
  "psychoneuroendocrinological": "Relating to the interaction between psychological processes and the nervous and endocrine systems.",
  "otorhinolaryngological": "Relating to the study of diseases of the ear, nose, and throat.",
  "immunoelectrochemiluminescence": "A technique used for detection of antigens or antibodies.",
  "radioallergosorbent": "A test used to detect specific IgE antibodies to suspected allergens.",
  "sternocleidomastoid": "A pair of long muscles that connect the sternum, clavicle, and mastoid process.",
  "hexakosioihexekontahexaphobia": "Fear of the number 666.",
  "sesquipedalian": "Characterized by long words; long-winded.",
  "defenestration": "The act of throwing someone out of a window.",
  "callipygian": "Having well-shaped buttocks.",
  "ombudsmen": "Officials appointed to investigate individuals' complaints against maladministration.",
  "syzygy": "A conjunction or opposition, especially of the moon with the sun.",
  "sphygmomanometer": "An instrument for measuring blood pressure.",
  "xenotransplantation": "The process of grafting or transplanting organs or tissues between members of different species.",
  "gobbledygook": "Language that is meaningless or is made unintelligible by excessive use of abstruse technical terms.",
  "schadenfreude": "Pleasure derived by someone from another person's misfortune.",
  "doppelganger": "An apparition or double of a living person.",
  "zeitgeist": "The defining spirit or mood of a particular period of history as shown by the ideas and beliefs of the time.",
  "polydactyly": "A condition in which a person or animal has more than five fingers or toes on one, or on each, hand or foot.",
  "idiosyncratic": "Relating to idiosyncrasy; peculiar or individual.",
  "onamatopoeia": "The formation of a word from a sound associated with what is named.",
  "onomatopoeia": "The formation of a word from a sound associated with what is named.",
  "miscellaneous": "Of various types or from different sources.",
  "bureaucracy": "A system of government in which most of the important decisions are made by state officials rather than by elected representatives.",
  "bourgeoisie": "The middle class, typically with reference to its perceived materialistic values or conventional attitudes.",
  "anachronistic": "Belonging to a period other than that being portrayed.",
  "pulchritudinous": "Beautiful.",
  "pusillanimous": "Showing a lack of courage or determination; timid.",
  "ubiquitous": "Present, appearing, or found everywhere.",
  "surveillance": "Close observation, especially of a suspected spy or criminal.",
  "phenomenon": "A fact or situation that is observed to exist or happen, especially one whose cause or explanation is in question.",
  "lieutenant": "A deputy or substitute acting for a superior.",
  "colonel": "An army officer of high rank, in particular an officer above a lieutenant colonel and below a brigadier.",
  "worcestershire": "A county in west central England; also a savory sauce.",
  "queue": "A line or sequence of people or vehicles awaiting their turn to be attended to or to proceed.",
  "quinoa": "A grain crop grown primarily for its edible seeds.",
  "pharaoh": "A ruler in ancient Egypt.",
  "yacht": "A medium-sized sailboat equipped for cruising or racing.",
  "misspelled": "Spelled incorrectly.",
  "embarrassment": "A feeling of self-consciousness, shame, or awkwardness.",
  "millennium": "A period of a thousand years.",
  "accommodate": "Fit in with the wishes or needs of.",
  "deductible": "Able to be deducted, especially from taxable income or tax to be paid.",
  "handkerchief": "A square of cotton or other finely woven material, typically carried in one's pocket and intended for blowing or wiping one's nose.",
  "indictment": "A formal charge or accusation of a serious crime.",
  "mortgage": "A legal agreement by which a bank or other creditor lends money at interest in exchange for taking title of the debtor's property.",
  "pneumonia": "Lung inflammation caused by bacterial or viral infection.",
  "raspberry": "An edible soft fruit related to the blackberry, consisting of a cluster of reddish-pink drupelets.",
  "receipt": "A written or printed statement acknowledging that something has been paid for or that goods have been received.",
  "rhythm": "A strong, regular, repeated pattern of movement or sound.",
  "vacuum": "A space entirely devoid of matter.",
  "weather": "The state of the atmosphere at a place and time.",
  "whether": "Expressing a doubt or choice between alternatives.",
  "weird": "Suggesting something supernatural; uncanny.",
  "necessary": "Required to be done, achieved, or present; needed; essential.",
  "separate": "Cause to move or be apart.",
  "definitely": "Without doubt (used for emphasis).",
  "miniscule": "Extremely small; tiny.",
  "minuscule": "Extremely small; tiny.",
  "occurrence": "An incident or event.",
  "parliament": "In the UK, the highest legislature, consisting of the Sovereign, the House of Lords, and the House of Commons.",
  "privilege": "A special right, advantage, or immunity granted or available only to a particular person or group.",
  "publicly": "So as to be seen by other people; in public.",
  "receive": "Be given, presented with, or paid (something).",
  "recommend": "Put forward (someone or something) with approval as being suitable for a particular purpose or role.",
  "referred": "Mention or allude to.",
  "relevant": "Closely connected or appropriate to what is being done or considered.",
  "restaurant": "A place where people pay to sit and eat meals that are cooked and served on the premises.",
  "schedule": "A plan for carrying out a process or procedure, giving lists of intended events and times.",
  "twelfth": "Constituring number twelve in a sequence.",
  "until": "Up to the point in time or the event mentioned.",
  "noob": "A person who is inexperienced in a particular sphere or activity.",
  "newb": "A newcomer or novice.",
  "phish": "The fraudulent practice of sending emails purporting to be from reputable companies.",
  "pwned": "Defeated or dominated (gaming slang).",
  "abacaxi": "A large, sweet pineapple grown in Brazil.",
  "gegenstandstheorie": "A theory of objects or items.",
  "flibbertigibbet": "A frivolous, flighty, or excessively talkative person.",
  "borborygmus": "A rumbling or gurgling noise made by the movement of fluid and gas in the intestines.",
  "absquatulate": "To leave abruptly.",
  "sniffle": "Sniff slightly or repeatedly, typically because of a cold or fit of crying.",
  "to": "Expressing motion in the direction of.",
  "too": "To a higher degree than is desirable, permissible, or possible; excessively.",
  "two": "Equivalent to the sum of one and one.",
  "there": "In, at, or to that place or position.",
  "their": "Belonging to or associated with the people or things previously mentioned.",
  "they're": "Contraction of 'they are'.",
  "write": "Mark (letters, words, or other symbols) on a surface, typically paper, with a pen, pencil, or similar implement.",
  "right": "True or correct as a fact.",
  "sight": "The faculty or power of seeing.",
  "site": "An area of ground on which a town, building, or monument is constructed.",
  "cite": "Quote (a passage, book, or author) as evidence for or justification of an argument or statement."
};

const parseWords = (text: string) => text.split('\n').map(w => w.trim()).filter(w => w.length > 0 && !w.startsWith('-'));

// 2. SORTED LISTS for Progressive Difficulty
// We sort by length so "nextWord" can pick based on streak.
const sortByLength = (arr: string[]) => arr.sort((a, b) => a.length - b.length);

const baby = sortByLength(parseWords(BABY_TEXT));
const cakewalk = sortByLength(parseWords(CAKEWALK_TEXT));
const learner = sortByLength(parseWords(LEARNER_TEXT));
const intermediate = sortByLength(parseWords(INTERMEDIATE_TEXT));
const heated = sortByLength(parseWords(HEATED_TEXT));
const genius = sortByLength(parseWords(GENIUS_TEXT));
const polymath = sortByLength(parseWords(SUPER_HARD_TEXT));
const omniscient = sortByLength([...baby, ...cakewalk, ...learner, ...intermediate, ...heated, ...genius, ...polymath]);

export const MODE_ORDER = ['baby', 'cakewalk', 'learner', 'intermediate', 'heated', 'genius', 'polymath', 'omniscient'];

export const wordBank: Record<string, string[]> = {
  baby,
  cakewalk,
  learner,
  intermediate,
  heated,
  genius,
  polymath,
  omniscient,
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
  // Check local dictionary first
  const lowerWord = word.toLowerCase().trim();
  if (LOCAL_DEFINITIONS[lowerWord]) {
    return LOCAL_DEFINITIONS[lowerWord];
  }

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

// Audio State Management
let currentAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null; 

export const stopAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
};

export const speak = async (word: string, volume: number = 1.0): Promise<void> => {
  stopAudio();

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', {
      method: 'POST',
      headers: {
        "xi-api-key": "YOUR_API_KEY",
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
    
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      audio.volume = volume;

      const finish = () => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };

      audio.onended = finish;
      audio.onerror = finish;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Autoplay prevented:", error);
          finish();
        });
      }
    });

  } catch (error) {
    console.error("Error playing audio, falling back:", error);
    
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(word);
        activeUtterance = utterance;
        utterance.volume = volume;
        
        const finish = () => {
          activeUtterance = null;
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
    });
  }
};
