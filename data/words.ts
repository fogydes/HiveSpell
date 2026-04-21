// Word Lists by Difficulty
// prettier-ignore
const BABY_WORDS = [
  "Air", "Heir", "Baby", "Bad", "Bag", "Ball", "Bawl", "Bar",
  "Bat", "Bee", "Be", "Best", "Big", "Bird", "Blue", "Blew",
  "Book", "Bug", "Bus", "Cake", "Car", "Cat", "Cool", "Cry",
  "Cup", "Dad", "Dog", "Duck", "Eat", "Elf", "End", "Eye",
  "Aye", "Face", "Fire", "Fish", "Phish", "Foot", "Gold", "Hand",
  "Ink", "Kiss", "Milk", "Mix", "Mom", "Moon", "Mug", "Newb",
  "Noob", "Pie", "Pi", "Pink", "Rain", "Reign", "Rat", "Red",
  "Read", "Ruby", "Run", "Sit", "Size", "Sighs", "Snow", "Soda",
  "Star", "Suck", "Sun", "Son", "Tag", "Tank", "Tap", "Town",
  "Tree", "Water", "Wind", "Word", "Zoo",
];

// prettier-ignore
const CAKEWALK_WORDS = [
  "Absorb", "Angel", "Ash", "Bingo", "Black", "Boss", "Brain", "Burger",
  "Burial", "Cabin", "Circle", "Clever", "Cliff", "Clutch", "Comply", "Convey",
  "Crowd", "Dairy", "Defy", "Demon", "Daemon", "Echo", "Emoji", "Erupt",
  "Exert", "Exile", "Film", "Filter", "Flower", "Flour", "Foggy", "Forbid",
  "Gender", "Ghost", "Giant", "Greedy", "Green", "Grub", "Hello", "Hotel",
  "House", "Human", "Hungry", "Intent", "Iron", "Irony", "Land", "Length",
  "Margin", "Melt", "Meow", "Monk", "Noble", "Nobel", "Orange", "Pasta",
  "Pear", "Pair", "Power", "Prank", "Pray", "Prey", "Proof", "Quack",
  "Queen", "Quill", "Rally", "Random", "Reply", "Robust", "Rot", "Wrought",
  "Shake", "Shark", "Sigh", "Psi", "Sock", "State", "Stew", "Still",
  "Stumble", "Trauma", "Twist", "Update", "Vein", "Vain", "Walk", "Way",
  "Weigh", "White", "Workout", "Wrist",
];

// prettier-ignore
const LEARNER_WORDS = [
  "Abolish", "Absence", "Abstract", "Agaric", "Agnostic", "Akin", "Albeit", "Alliance",
  "Alphabet", "Anatomical", "Answer", "Appetite", "Armor", "Armour", "Atone", "Automatic",
  "Await", "Bamboo", "Bayonet", "Betray", "Biography", "Bizarre", "Breakthrough", "Broccoli",
  "Catalog", "Catalogue", "Center", "Centre", "Chicken", "Chronic", "Church", "Congratulate",
  "Cooking", "Curious", "Damage", "Debris", "Diesel", "Dilate", "Dolphin", "Enact",
  "Excellent", "Familiar", "Firefighter", "Flavor", "Flavour", "Formidable", "Frolic", "Furious",
  "Gallant", "Gradual", "Guideline", "Harbor", "Harbour", "Heresy", "Immobilize", "Immobilise",
  "Integrity", "Ionize", "Ionise", "Lactose", "Lather", "Leafy", "Liable", "Lightning",
  "Magnificent", "Meditate", "Normal", "Oasis", "Obesity", "Offender", "Overdue", "Overdo",
  "Paradox", "Password", "Pigeon", "Pidgin", "Plethora", "Powder", "Present", "Probably",
  "Pulsar", "Pumpkin", "Pursuit", "Recipient", "Refrain", "Refugee", "Remarkable", "Rye",
  "Wry", "Scrutiny", "Secret", "Seldom", "Semicircle", "Sigma", "Sleigh", "Slay",
  "Sniffle", "Special", "Spooky", "Strategic", "Subsidy", "Swamp", "Syntax", "Tangerine",
  "Telepathy", "Thesis", "Tremendous", "Twenty", "Uncomfortable", "Understand", "Vague", "Villain",
  "Voluntary", "Walnut", "Warrior", "Window", "Zombie",
];

// prettier-ignore
const INTERMEDIATE_WORDS = [
  "Abditive", "Abdomen", "Abhorrent", "Abscond", "Accomplishment", "Accommodate", "Accumulation", "Adolescent",
  "Adversity", "Aegis", "Aerodynamic", "Agriculture", "Apostrophe", "Articulate", "Aspiration", "Assumption",
  "Asunder", "Asthma", "Atmospheric", "Beneficiary", "Benevolence", "Blizzard", "Bronchitis", "Brusque",
  "Calibration", "Candlelight", "Caustic", "Champagne", "Charisma", "Chlorophyll", "Christmas", "Cognitive",
  "Colonel", "Kernel", "Combustible", "Commodity", "Concentration", "Consumption", "Contour", "Controversial",
  "Cuisine", "Dauntless", "Deployment", "Derogatory", "Detrimental", "Diplomatic", "Disappointment", "Disconsolate",
  "Division", "Doctrine", "Elaborate", "Embarrassment", "Embassy", "Enchantment", "Encore", "Endeavor",
  "Endeavour", "Epiphany", "Epsilon", "Erratic", "Euphoria", "Exaggerate", "Excalibur", "Exorcism",
  "Expenditure", "Exponential", "Extravagant", "Fantasy", "Favorable", "Favourable", "Featherweight", "Fictitious",
  "Fjord", "Flamboyant", "Fluorescent", "Forthcoming", "Frostbite", "Fruition", "Gastronomic", "Gazebo",
  "Gibberish", "Gingerbread", "Glacier", "Gratitude", "Gravestone", "Hailstone", "Heritage", "Hexagonal",
  "Hibernation", "Hornswoggle", "Hourglass", "Humanitarian", "Hypothesis", "Ideological", "Idiom", "Imminent",
  "Imprisonment", "Independence", "Indifference", "Inhabitant", "Insinuate", "Intermediate", "Intermission", "Jaded",
  "Juxtaposition", "Kangaroo", "Languid", "Legendary", "Limousine", "Livery", "Mathematician", "Melancholy",
  "Metabolism", "Methodology", "Microorganism", "Misconception", "Mistletoe", "Multiplication", "Myopic", "Nebulous",
  "Necromancer", "Negotiation", "Neighboring", "Neighbouring", "Nonplussed", "Notorious", "Obituary", "Oblivious",
  "Opaque", "Optimism", "Palatine", "Pantograph", "Parallel", "Participation", "Passionate", "Peppermint",
  "Periodically", "Personnel", "Pestilence", "Photographer", "Pomegranate", "Portfolio", "Practitioner", "Predominantly",
  "Problematic", "Proclamation", "Procrastinate", "Pronunciation", "Propaganda", "Protocol", "Pygmy", "Ravenous",
  "Recession", "Reincarnation", "Reliability", "Residential", "Resilience", "Resurrection", "Revelation", "Rhythm",
  "Ricochet", "Sabotage", "Sachet", "Sashay", "Sapphire", "Scholarship", "Sentimental", "Separation",
  "Shareholder", "Significance", "Skeleton", "Snowflake", "Solidarity", "Spokesperson", "Steadfast", "Stereotype",
  "Supposedly", "Surrogate", "Surveillance", "Susceptible", "Syllable", "Symmetrical", "Systematic", "Technological",
  "Thesaurus", "Transaction", "Translucent", "Transparency", "Transportation", "Unprecedented", "Validity", "Venerate",
  "Violation", "Vulnerability", "Wednesday", "Wholeheartedly", "Worthwhile",
];

// prettier-ignore
const HEATED_WORDS = [
  "Abacaxi", "Abasia", "Acculturate", "Aforementioned", "Aggrandize", "Aggrandise", "Agoraphobia", "Agoraphobic",
  "Ambidextrous", "Ambiguous", "Anaphylactic", "Anemone", "Anisosquaric", "Apocryphal", "Apothecary", "Asphyxiation",
  "Astigmatism", "Ataraxy", "Attorney", "Bandeau", "Belvedere", "Betwixt", "Blatherskite", "Bodacious",
  "Bogolanfini", "Brucellosis", "Bucolic", "Cacophony", "Calamitous", "Calumny", "Capoeira", "Capricious",
  "Captious", "Cerulean", "Charcuterie", "Chauffeur", "Chronological", "Cinematographer", "Clandestine", "Coalescence",
  "Codicil", "Colloquialism", "Comeuppance", "Commodore", "Compunction", "Consanguine", "Consummate", "Contradistinguish",
  "Correspondence", "Counterintuitive", "Culvert", "Cyrillic", "Defenestration", "Deleterious", "Depilatory", "Diminution",
  "Discombobulate", "Dodecahedron", "Eloquent", "Elysian", "Elision", "Epitome", "Ethnomethodology", "Extraterrestrial",
  "Facsimile", "Fastidious", "Fissiparous", "Flummox", "Fuchsia", "Garrulous", "Gentrification", "Glaucomatous",
  "Glockenspiel", "Gobbledygook", "Gobbledegook", "Grandiloquent", "Handkerchief", "Harpsichord", "Hemoglobin", "Haemoglobin",
  "Heterozygous", "Hierarchy", "Homeopathy", "Homoeopathy", "Homogeneous", "Horticulturist", "Hypermetropia", "Iconoclast",
  "Incandescent", "Inchoate", "Incoagulable", "Indefatigable", "Ingenious", "Irascible", "Isometropia", "Isthmus",
  "Kaleidoscope", "Latitudinarianism", "Legislation", "Lexicography", "Liaison", "Loquacious", "Lugubrious", "Lymphangiography",
  "Macabre", "Magniloquent", "Malapropism", "Martyrdom", "Mellifluous", "Menagerie", "Meretricious", "Microminiaturisation",
  "Microminiaturization", "Milieu", "Miniscule", "Minuscule", "Miscellaneous", "Monochromatic", "Monosyllabic", "Multidimensionality",
  "Municipal", "Myriad", "Narcissistic", "Nauseous", "Neuroplasticity", "Nocturne", "Nocturn", "Nomenclature",
  "Nutritious", "Obfuscation", "Onomatopoeia", "Paradigm", "Parliamentary", "Paroxysm", "Pecuniary", "Pernicious",
  "Pessimistic", "Phantasmagoria", "Pharaoh", "Farrow", "Phenomenon", "Phlegm", "Photogeochemistry", "Pirouette",
  "Pneumatic", "Polemic", "Polychromatic", "Polydactyly", "Predecessor", "Prestigious", "Psychological", "Puerile",
  "Pugnacious", "Querimony", "Quixotry", "Radiometeorograph", "Rambunctious", "Rehabilitation", "Reminiscence", "Rendezvous",
  "Sagacious", "Sanguine", "Sarcophagus", "Scintillate", "Semaphore", "Sententiously", "Sequacious", "Sequoia",
  "Silhouette", "Simultaneous", "Soliloquy", "Sovereignty", "Subpoena", "Subterranean", "Supercentenarian", "Supersede",
  "Supercede", "Syllepsis", "Symbiosis", "Syzygy", "Tempestuous", "Tetraphobia", "Therapeutic", "Thermionic",
  "Thermoluminescence", "Triphosphate", "Ubiquitous", "Uncharacteristic", "Unintelligible", "Verbatim", "Vexatious", "Vignette",
  "Xenogeneic", "Zephyr", "Zygote",
];

// prettier-ignore
const GENIUS_WORDS = [
  "Abdominothoracic", "Absquatulate", "Acetaminophen", "Achromatophil", "Achromatophilia", "Acquiesce", "Allotransplantation", "Anachronistic",
  "Aneurysmorrhaphy", "Antediluvian", "Arthroereisis", "Ascosporogenous", "Autothaumaturgist", "Baccalaureate", "Batrachophobia", "Borborygmus",
  "Bougainvillea", "Bourgeoisie", "Buckminsterfullerene", "Bureaucracy", "Chronopsychophysiology", "Clinicoechocardiographic", "Compartmentalization", "Compartmentalisation",
  "Countermajoritarianism", "Craniosynostosis", "Cryptoendolithic", "Dendrochronology", "Deoxyribonucleic", "Dichotomization", "Dichotomisation", "Eclaircissement",
  "Effervescent", "Electrotelethermometer", "Entrepreneur", "Ethnopsychopharmacology", "Flibbertigibbet", "Fossiliferous", "Frontoethmoidectomy", "Gastroenterologist",
  "Geitonogamy", "Geochronostratigraphical", "Glyceraldehyde", "Goniosynechialysis", "Gubernatorial", "Hemispherectomy", "Hieroglyphics", "Hydrochlorofluorocarbon",
  "Hypercholesterolemia", "Hypergammaglobulinemia", "Hypergammaglobulinaemia", "Hypergonadotropic", "Hyperpolysyllabic", "Hypoparathyroidism", "Incomprehensibility", "Infinitesimal",
  "Infundibulum", "Institutionalization", "Institutionalisation", "Jurisprudence", "Labyrinthine", "Lepidopterology", "Machiavellian", "Mechanotransduction",
  "Methemoglobinemia", "Metonymic", "Morphodifferentiation", "Necrobiosislipoidica", "Neuroimmunomodulation", "Neuropsychological", "Oligonucleotide", "Orthogeosyncline",
  "Panproctocolectomy", "Parallelogrammatic", "Paraphernalia", "Perspicacious", "Photoreconnaissance", "Plasmodiumfalciparum", "Plenipotentiary", "Portmanteau",
  "Prestidigitation", "Proceleusmatic", "Prognostication", "Pseudohyperaldosteronism", "Pseudoparallelodromous", "Pseudoriemannian", "Psychoneuroimmunology", "Psychopharmacotherapy",
  "Psychotomimetic", "Pulchritudinous", "Pusillanimous", "Quasiautobiographical", "Quasquicentennial", "Quindecasyllabic", "Quoddamodotative", "Radioallergosorbent",
  "Rhinorrhagia", "Serendipity", "Sesquipedalian", "Spectrophotometer", "Subcompartmentalization", "Subcompartmentalisation", "Subdermatoglyphic", "Supererogatory",
  "Superferromagnetism", "Susurration", "Temporomandibular", "Thalassophobia", "Thermochromatography", "Tintinnabulation", "Transinstitutionalization", "Transinstitutionalisation",
  "Trinitrotoluene", "Utilitarianism", "Verisimilitude", "Worcestershire", "Xiphiplastron", "Xylotypographic",
];

// prettier-ignore
const POLYMATH_WORDS = [
  "Acetylglucocoroglaucigenin", "Acrocephalopolydactylousdysplasia", "Adrenocorticotropin", "Adrenocorticotrophin", "Anthropomorphization", "Anthropomorphisation", "Antidisestablishmentarianism", "Antixerophthalmic",
  "Bourgeoisification", "Bromochlorodifluoromethane", "Canaliculodacryocystorhinostomy", "Chargoggagoggmanchauggagoggchaubunagungamaugg", "Cholangiocholecystocholedochectomy", "Cholangiopancreatography", "Chondromyxohemangioendotheliosarcoma", "Convolvulaceous",
  "Corticopontocerebellar", "Corynebacteriumpseudotuberculosis", "Counterimmunoelectrophoresis", "Dehydrothiotoluidine", "Dermatofibrosarcomaprotuberans", "Dextrodeorsumversion", "Dichlorodiphenyltrichloroethane", "Diisopropylfluorophosphate",
  "Eellogofusciouhipoppokunurious", "Encephalocraniocutaneouslipomatosis", "Erythrocytapheresis", "Ferriprotoporphyrin", "Floccinaucinihilipilification", "Fluorotetraferriphlogopite", "Gegenstandstheorie", "Hematospectrophotometrically",
  "Haematospectrophotometrically", "Hexakosioihexekontahexaphobia", "Hippopotomonstrosesquipedaliophobia", "Hippopotomonstrosesquippedaliophobia", "Honorificabilitudinity", "Honourificabilitudinity", "Hypothalamicpituitaryadrenocortical", "Immunoelectrochemiluminescence",
  "Inositolphosphorylceramide", "Laparohysterosalpingooophorectomy", "Laryngotracheobronchitis", "Loncastuximabtesirine", "Lymphangioleiomyomatosis", "Micropachycephalosaurus", "Neohesperidindihydrochalcone", "Nonanonacontanonactanonaliagon",
  "Nucleotidylexotransferase", "Orotatephosphoribosyltransferase", "Otorhinolaryngological", "Photoplethysmography", "Pneumoencephalography", "Pneumonoultramicroscopicsilicovolcanoconiosis", "Polyphiloprogenitive", "Pseudopseudohypoparathyroidism",
  "Pseudorhombicuboctahedron", "Psychoneuroendocrinological", "Psychophysicotherapeutics", "Pyrrolizidinealkaloidosis", "Ribulosebisphosphatecarboxylaseoxygenase", "Sclerectoiridectomy", "Spectrophotofluorometry", "Sphenopalatineganglioneuralgia",
  "Sphygmomanometer", "Stereoelectroencephalography", "Supercalifragilisticexpialidocious", "Thyroparathyroidectomy", "Tonsillopharyngitis", "Uvulopalatopharyngoplasty", "Ventriculocisternostomy",
];

// Local Definitions for Offline Support
export const LOCAL_DEFINITIONS: Record<string, string> = {
  // --- Baby & Cakewalk ---
  be: "To exist or live.",
  daemon: "A supernatural being or spirit in Greek mythology; a variant of demon.",
  nobel: "Relating to Alfred Nobel or the prizes established by his will.",
  // --- Learner ---
  // --- Intermediate ---
  abditive: "Having the power or quality of hiding.",
  jaded: "Tired, bored, or lacking enthusiasm, typically after having too much of something.",
  christmas:
    "An annual Christian holiday celebrating the birth of Jesus Christ.",
  excalibur: "The legendary sword of King Arthur.",
  wednesday: "The day of the week before Thursday and following Tuesday.",

  // --- Heated ---
  triphosphate: "A salt or ester containing three phosphate groups.",
  tetraphobia: "An irrational fear of the number 4.",
  supercede: "To take the place of; to replace.",
  sententiously: "In a manner that is given to moralizing in a pompous or affected way.",
  querimony: "A complaint or expression of discontent.",
  photogeochemistry:
    "The study of light-induced chemical reactions of Earth materials.",
  pernicious: "Having a harmful effect, especially in a gradual or subtle way.",
  nutritious: "Nourishing; efficient as food.",
  multidimensionality: "The state of having many dimensions or aspects.",
  microminiaturization:
    "The manufacture of extremely small electronic devices.",
  meretricious:
    "Apparently attractive but having in reality no value or integrity.",
  loquacious: "Tending to talk a great deal; talkative.",
  latitudinarianism:
    "A lack of strictness or rigidity in religious or other matters.",
  isometropia: "Equality in the refraction of the two eyes.",
  irascible: "Having or showing a tendency to be easily angered.",
  incoagulable: "Incapable of coagulating or clotting.",
  glaucomatous: "Relating to or affected by glaucoma.",
  garrulous: "Excessively talkative, especially on trivial matters.",
  cyrillic: "Denoting the alphabet used by many Slavic languages.",
  anisosquaric: "Relating to a derivative of squaric acid.",
  abacaxi: "A large, sweet pineapple grown in Brazil.",
  abasia: "Inability to walk due to a lack of motor coordination.",
  accommodate: "Fit in with the wishes or needs of.",
  acculturate: "Assimilate to a different culture, typically the dominant one.",
  aegis:
    "The protection, backing, or support of a particular person or organization.",
  aggrandize:
    "Enhance the reputation or power of someone beyond what is justified.",
  ambidextrous: "Able to use the right and left hands equally well.",
  apocryphal:
    "of doubtful authenticity, although widely circulated as being true.",
  ataraxy: "A state of serene calmness.",
  blatherskite: "A person who talks at great length without making much sense.",
  bodacious: "Excellent, admirable, or attractive.",
  bucolic:
    "Relating to the pleasant aspects of the countryside and country life.",
  cacophony: "A harsh, discordant mixture of sounds.",
  capricious: "Given to sudden and unaccountable changes of mood or behavior.",
  cerulean: "Deep blue in color like a clear sky.",
  clandestine: "Kept secret or done secretively.",
  codicil:
    "An addition or supplement that explains, modifies, or revokes a will.",
  defenestration: "The act of throwing someone or something out of a window.",
  deleterious: "Causing harm or damage.",
  discombobulate: "Disconcert or confuse (someone).",
  dodecahedron: "A three-dimensional shape having twelve plane faces.",
  elysian: "Relating to or characteristic of heaven or paradise.",
  fissiparous:
    "Inclined to cause or undergo division into separate parts or groups.",
  flummox: "Perplex (someone) greatly; bewilder.",
  glockenspiel:
    "A musical percussion instrument having a set of tuned metal pieces.",
  gobbledygook:
    "Language that is meaningless or is made unintelligible by excessive use of abstruse technical terms.",
  grandiloquent: "Pompous or extravagant in language, style, or manner.",
  horticulturist:
    "An expert in or student of garden cultivation and management.",
  iconoclast: "A person who attacks cherished beliefs or institutions.",
  indefatigable: "Persisting tirelessly.",
  lugubrious: "Looking or sounding sad and dismal.",
  mellifluous: "(of a voice or words) sweet or musical; pleasant to hear.",
  milieu: "A person's social environment.",
  nocturne:
    "A short composition of a romantic or dreamy character suggestive of night.",
  obfuscation:
    "The action of making something obscure, unclear, or unintelligible.",
  paroxysm:
    "A sudden attack or violent expression of a particular emotion or activity.",
  phantasmagoria:
    "A sequence of real or imaginary images like those seen in a dream.",
  polemic: "A strong verbal or written attack on someone or something.",
  puerile: "Childishly silly and trivial.",
  quixotry: "Visionary or impractical schemes or ideas.",
  rambunctious: "Uncontrollably exuberant; boisterous.",
  sagacious: "Having or showing keen mental discernment and good judgment.",
  sanguine:
    "Optimistic or positive, especially in an apparently bad or difficult situation.",
  scintillate: "Emit flashes of light; sparkle.",
  sequoia: "A redwood tree, especially the giant sequoia.",
  subpoena: "A writ ordering a person to attend a court.",
  syzygy: "A conjunction or opposition, especially of the moon with the sun.",
  ubiquitous: "Present, appearing, or found everywhere.",
  zephyr: "A soft gentle breeze.",
  zygote: "A diploid cell resulting from the fusion of two haploid gametes.",

  // --- Genius ---
  compartmentalisation:
    "The division of something into sections or categories (British spelling).",
  dichotomisation:
    "The division into two mutually exclusive, opposed, or contradictory groups (British spelling).",
  hydrochlorofluorocarbon:
    "A compound containing hydrogen, chlorine, fluorine, and carbon atoms; used as a refrigerant.",
  hypergammaglobulinaemia:
    "A condition characterized by increased levels of immunoglobulins in the blood (British spelling).",
  institutionalisation:
    "The process of establishing something as a convention or norm in an organization (British spelling).",
  methemoglobinemia:
    "A blood disorder in which an abnormal amount of methemoglobin is produced.",
  neuroimmunomodulation:
    "The process by which the nervous system modulates immune responses.",
  psychopharmacotherapy:
    "The treatment of mental disorders using pharmaceutical drugs.",
  subcompartmentalisation:
    "The division into smaller compartments or sub-units (British spelling).",
  transinstitutionalisation:
    "The transfer of individuals from one institutional setting to another (British spelling).",
  xylotypographic: "Printed from wooden blocks.",
  xiphiplastron: "The rear lateral plate of the plastron of a turtle.",
  transinstitutionalization:
    "The transfer of individuals from one institutional setting to another.",
  thermochromatography:
    "A chromatographic technique using a temperature gradient.",
  thalassophobia: "An intense and persistent fear of the sea.",
  temporomandibular:
    "Relating to the joint connecting the jawbone to the skull.",
  superferromagnetism: "A form of magnetism exhibited by nanoparticles.",
  supererogatory: "Performed beyond what is required or expected.",
  subdermatoglyphic:
    "Located beneath the patterned ridges on the skin of the fingers and palms.",
  subcompartmentalization:
    "The division into smaller compartments or sub-units.",
  rhinorrhagia: "A severe nosebleed.",
  radiometeorograph:
    "An instrument carried by a balloon or other airborne device for recording meteorological data.",
  radioallergosorbent:
    "A laboratory test used to determine a person's allergy to a specific substance.",
  quoddamodotative:
    "A philosophical term relating to a particular mode of being.",
  quindecasyllabic: "Consisting of fifteen syllables.",
  quasquicentennial: "A 125th anniversary.",
  quasiautobiographical: "Partially autobiographical.",
  pseudoriemannian:
    "Relating to a manifold with a metric tensor that is not positive-definite.",
  pseudoparallelodromous:
    "A term describing a specific pattern of leaf venation.",
  pseudohyperaldosteronism:
    "A condition mimicking the effects of hyperaldosteronism.",
  proceleusmatic: "An animating or inciting verse meter.",
  plasmodiumfalciparum: "A protozoan parasite that causes malaria in humans.",
  paraphernalia:
    "Miscellaneous articles, especially the equipment needed for a particular activity.",
  parallelogrammatic: "Having the shape of a parallelogram.",
  panproctocolectomy:
    "The surgical removal of the entire colon, rectum, and anal canal.",
  orthogeosyncline:
    "A geosyncline located between cratons or continental masses.",
  neuropsychological:
    "Relating to the relationship between brain function and behavior.",
  necrobiosislipoidica:
    "A necrotizing skin condition usually associated with diabetes.",
  morphodifferentiation:
    "The process by which cells or tissues change their shape or form.",
  metonymic:
    "Relating to a figure of speech in which a thing or concept is referred to by the name of something closely associated with it.",
  mechanotransduction:
    "The cellular processes that translate mechanical stimuli into biochemical signals.",
  lepidopterology: "The branch of entomology concerning butterflies and moths.",
  incomprehensibility: "The state of being impossible to understand.",
  hyperpolysyllabic:
    "Consisting of an exceptionally large number of syllables.",
  hypergonadotropic: "Relating to an excess of gonadotropins.",
  hypergammaglobulinemia:
    "A condition characterized by increased levels of immunoglobulins in the blood.",
  hemispherectomy:
    "A surgical procedure where one half of the brain is removed or disabled.",
  goniosynechialysis:
    "A surgical procedure to separate adhesions in the angle of the eye.",
  glyceraldehyde: "A simple triose sugar.",
  geochronostratigraphical:
    "Relating to the branch of stratigraphy combining geochronology and chronostratigraphy.",
  frontoethmoidectomy:
    "The surgical removal of part of the frontal and ethmoid sinuses.",
  ethnopsychopharmacology:
    "The study of cultural variations in response to psychiatric medications.",
  electrotelethermometer:
    "An electronic device for measuring temperature remotely.",
  dichotomization:
    "The division into two mutually exclusive, opposed, or contradictory groups.",
  deoxyribonucleic: "Related to DNA, the carrier of genetic information.",
  cryptoendolithic: "Living within rocks, typically in microscopic spaces.",
  craniosynostosis:
    "A condition in which one or more of the fibrous sutures in an infant skull prematurely fuses.",
  countermajoritarianism: "A political philosophy opposing majority rule.",
  clinicoechocardiographic:
    "Relating to clinical and echocardiographic findings.",
  chronopsychophysiology:
    "The study of psychological and physiological processes chronologically.",
  bogolanfini: "A traditional Malian cloth mud-dyed with geometrical patterns.",
  batrachophobia: "An abnormal fear of amphibians, such as frogs and toads.",
  ascosporogenous: "Producing ascospores.",
  arthroereisis: "The surgical limitation of joint movement.",
  aneurysmorrhaphy: "The surgical suturing of an aneurysm.",
  allotransplantation:
    "The transplant of an organ or tissue between two genetically non-identical individuals.",
  achromatophilia: "The property of not being easily stained.",
  achromatophil: "A cell or tissue that does not stain readily.",
  abdominothoracic: "Relating to the abdomen and thorax.",
  absquatulate: "To leave abruptly.",
  acetaminophen: "An analgesic drug used to treat headaches, arthritis, etc.",
  acquiesce: "Accept something reluctantly but without protest.",
  anachronistic: "Belonging to a period other than that being portrayed.",
  antediluvian: "Of or belonging to the time before the biblical Flood.",
  borborygmus:
    "A rumbling or gurgling noise made by the movement of fluid and gas in the intestines.",
  bougainvillea:
    "An ornamental climbing plant widely cultivated in the tropics.",
  bourgeoisie:
    "The middle class, typically with reference to its perceived materialistic values.",
  bureaucracy:
    "A system of government in which most of the important decisions are made by state officials.",
  effervescent: "Giving off bubbles; fizzy.",
  entrepreneur: "A person who organizes and operates a business or businesses.",
  flibbertigibbet: "A frivolous, flighty, or excessively talkative person.",
  gubernatorial:
    "Relating to a state governor or the office of state governor.",
  hieroglyphics: "Enigmatic or incomprehensible symbols or writing.",
  machiavellian: "Cunning, scheming, and unscrupulous, especially in politics.",
  onomatopoeia:
    "The formation of a word from a sound associated with what is named.",
  perspicacious: "Having a ready insight into and understanding of things.",
  plenipotentiary:
    "A person, especially a diplomat, invested with the full power of independent action.",
  portmanteau:
    "A large trunk or suitcase, typically made of stiff leather and opening into two equal parts.",
  prestidigitation: "Magic tricks performed as entertainment.",
  prognostication: "The action of foretelling or prophesying future events.",
  pulchritudinous: "Beautiful.",
  pusillanimous: "Showing a lack of courage or determination; timid.",
  serendipity:
    "The occurrence and development of events by chance in a happy or beneficial way.",
  sesquipedalian: "Characterized by long words; long-winded.",
  soliloquy: "An act of speaking one's thoughts aloud when by oneself.",
  susurration: "Whispering, murmuring, or rustling.",
  utilitarianism:
    "The doctrine that actions are right if they are useful or for the benefit of a majority.",
  verisimilitude: "The appearance of being true or real.",
  worcestershire: "A savory sauce containing soy sauce and vinegar.",

  // --- Polymath ---
  acrocephalopolydactylousdysplasia:
    "A rare congenital syndrome characterized by a pointed head and extra fingers or toes.",
  adrenocorticotrophin:
    "A hormone produced by the pituitary gland that stimulates the adrenal cortex (British spelling).",
  anthropomorphisation:
    "The attribution of human characteristics or behavior to a god, animal, or object (British spelling).",
  corynebacteriumpseudotuberculosis:
    "A bacterium that causes caseous lymphadenitis in sheep and goats.",
  hippopotomonstrosesquippedaliophobia:
    "The fear of long words (variant spelling with double p).",
  orotatephosphoribosyltransferase:
    "An enzyme involved in the pyrimidine biosynthesis pathway.",
  uvulopalatopharyngoplasty:
    "A surgical procedure used to remove tissue in the throat to treat sleep apnea.",
  tonsillopharyngitis: "Inflammation of the tonsils and pharynx.",
  stereoelectroencephalography:
    "A minimally invasive surgical procedure used to identify epileptogenic zones in the brain.",
  sphenopalatineganglioneuralgia:
    "The scientific term for 'brain freeze' or 'ice cream headache'.",
  spectrophotofluorometry:
    "An analytical method used to measure the fluorescence of a sample.",
  sclerectoiridectomy: "Surgical excision of portions of the sclera and iris.",
  ribulosebisphosphatecarboxylaseoxygenase:
    "RuBisCO, an enzyme involved in carbon fixation during photosynthesis.",
  pyrrolizidinealkaloidosis:
    "Toxicosis caused by ingestion of pyrrolizidine alkaloids.",
  psychophysicotherapeutics:
    "Therapeutic treatment involving both psychological and physical elements.",
  psychoneuroendocrinological:
    "Relating to the clinical study of hormone fluctuations and behavior.",
  pseudorhombicuboctahedron:
    "A convex polyhedron with 8 triangular and 18 square faces.",
  pseudopseudohypoparathyroidism:
    "An inherited condition causing short stature and shortened bones.",
  polyphiloprogenitive: "Extremely prolific; generating many offspring.",
  photoplethysmography:
    "An optical technique used to detect blood volume changes.",
  nucleotidylexotransferase: "An enzyme involved in DNA synthesis.",
  nonanonacontanonactanonaliagon: "A polygon with 99,999 sides.",
  neohesperidindihydrochalcone: "An artificial sweetener derived from citrus.",
  lymphangioleiomyomatosis:
    "A rare lung disease resulting in abnormal growth of smooth muscle cells.",
  loncastuximabtesirine: "An antibody-drug conjugate used in cancer treatment.",
  laryngotracheobronchitis:
    "Croup, an inflammation of the larynx, trachea, and bronchi.",
  laparohysterosalpingooophorectomy:
    "Surgical removal of the uterus, fallopian tubes, and ovaries.",
  inositolphosphorylceramide: "A sphingolipid found in yeast and plants.",
  immunoelectrochemiluminescence:
    "A highly sensitive diagnostic testing method using luminescence.",
  hypothalamicpituitaryadrenocortical:
    "Relating to the interaction between the hypothalamus, pituitary gland, and adrenal cortex.",
  honourificabilitudinity: "The state of being able to achieve honours.",
  hexakosioihexekontahexaphobia: "The fear of the number 666.",
  haematospectrophotometrically:
    "By means of an instrument evaluating blood photometrically.",
  hematospectrophotometrically:
    "By means of an instrument evaluating blood photometrically.",
  fluorotetraferriphlogopite: "A complex synthetic silicate mineral.",
  ferriprotoporphyrin: "An iron-containing porphyrin compound.",
  erythrocytapheresis:
    "A medical procedure that separates red blood cells from the rest of the blood.",
  encephalocraniocutaneouslipomatosis:
    "A rare congenital neurocutaneous disorder.",
  eellogofusciouhipoppokunurious: "A nonsense word meaning 'good'.",
  diisopropylfluorophosphate: "A highly toxic organophosphorus compound.",
  dichlorodiphenyltrichloroethane:
    "DDT, a commonly known synthetic insecticide.",
  dextrodeorsumversion: "The turning of both eyes downward and to the right.",
  dermatofibrosarcomaprotuberans:
    "A rare type of skin cancer that begins in connective tissue.",
  dehydrothiotoluidine:
    "A chemical compound used as an intermediate in dye manufacturing.",
  counterimmunoelectrophoresis:
    "A laboratory technique used to detect antigens or antibodies.",
  corticopontocerebellar:
    "Relating to the neural pathway connecting the cerebral cortex, pons, and cerebellum.",
  chondromyxohemangioendotheliosarcoma:
    "A rare type of malignant tumor consisting of multiple tissue types.",
  cholangiopancreatography:
    "An imaging technique used to examine the bile ducts and pancreas.",
  cholangiocholecystocholedochectomy:
    "Surgical removal of the gallbladder and bile ducts.",
  chargoggagoggmanchauggagoggchaubunagungamaugg:
    "A lake in Webster, Massachusetts, known as the longest place name in the US.",
  canaliculodacryocystorhinostomy:
    "A surgical procedure to create a new tear drainage pathway.",
  bromochlorodifluoromethane:
    "A halon gas used primarily as a fire suppression agent.",
  bourgeoisification: "The process of becoming bourgeois or middle-class.",
  antixerophthalmic: "Preventing or curing xerophthalmia (dry eye disease).",
  acetylglucocoroglaucigenin:
    "A complex chemical compound native to certain plants.",
  anthropomorphization:
    "The attribution of human characteristics or behavior to a god, animal, or object.",
  antidisestablishmentarianism:
    "Opposition to the disestablishment of the Church of England.",
  autothaumaturgist:
    "One who pretends to be mystically self-taught or self-enlightened.",
  convolvulaceous: "Belonging to the morning glory family of plants.",
  floccinaucinihilipilification:
    "The action or habit of estimating something as worthless.",
  gastroenterologist:
    "A medical practitioner qualified to diagnose and treat disorders of the stomach and intestines.",
  gegenstandstheorie: "A theory of objects or items, associated with Meinong.",
  hippopotomonstrosesquipedaliophobia: "The fear of long words.",
  honorificabilitudinity: "The state of being able to achieve honours.",
  micropachycephalosaurus: "A genus of small herbivorous dinosaur.",
  otorhinolaryngological:
    "Relating to the study of diseases of the ear, nose, and throat.",
  pneumonoultramicroscopicsilicovolcanoconiosis:
    "A lung disease caused by inhaling very fine ash and sand dust.",
  psychoneuroimmunology:
    "The study of the effect of the mind on health and resistance to disease.",
  sphygmomanometer: "An instrument for measuring blood pressure.",
  supercalifragilisticexpialidocious: "Extraordinarily good; wonderful.",
  thyroparathyroidectomy:
    "Surgical removal of the thyroid and parathyroid glands.",
  ventriculocisternostomy:
    "A surgical operation to create a communication between a cerebral ventricle and a cisterna magna.",

  // --- Common Homophones & others ---
  phish:
    "The fraudulent practice of sending emails purporting to be from reputable companies.",
  newb: "A newcomer or novice.",
  noob: "A person who is inexperienced in a particular sphere or activity.",
  psi: "The twenty-third letter of the Greek alphabet.",
  sigh: "Emit a long, deep, audible breath expressing sadness, relief, or tiredness.",
};

// Sorted Word Lists (Shortest to Longest)
const sortByLength = (arr: string[]) => arr.sort((a, b) => a.length - b.length);

const baby = sortByLength(BABY_WORDS);
const cakewalk = sortByLength(CAKEWALK_WORDS);
const learner = sortByLength(LEARNER_WORDS);
const intermediate = sortByLength(INTERMEDIATE_WORDS);
const heated = sortByLength(HEATED_WORDS);
const genius = sortByLength(GENIUS_WORDS);
const polymath = sortByLength(POLYMATH_WORDS);
const omniscient = sortByLength([
  ...baby,
  ...cakewalk,
  ...learner,
  ...intermediate,
  ...heated,
  ...genius,
  ...polymath,
]);

export const MODE_ORDER = [
  "baby",
  "cakewalk",
  "learner",
  "intermediate",
  "heated",
  "genius",
  "polymath",
  "omniscient",
];

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

// Determine which difficulty a word belongs to (for dynamic nectar in Omniscient mode)
// Returns the HIGHEST difficulty the word appears in
export const getWordDifficulty = (word: string): string => {
  const lowerWord = word.toLowerCase();

  // Check in order from hardest to easiest so we return the highest difficulty
  if (polymath.map((w) => w.toLowerCase()).includes(lowerWord))
    return "polymath";
  if (genius.map((w) => w.toLowerCase()).includes(lowerWord)) return "genius";
  if (heated.map((w) => w.toLowerCase()).includes(lowerWord)) return "heated";
  if (intermediate.map((w) => w.toLowerCase()).includes(lowerWord))
    return "intermediate";
  if (learner.map((w) => w.toLowerCase()).includes(lowerWord)) return "learner";
  if (cakewalk.map((w) => w.toLowerCase()).includes(lowerWord))
    return "cakewalk";
  if (baby.map((w) => w.toLowerCase()).includes(lowerWord)) return "baby";

  return "baby"; // fallback
};
