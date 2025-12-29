const BOOK_NAMES: Record<string, string> = {
  Gen: "Genesis",
  Exod: "Exodus",
  Lev: "Leviticus",
  Num: "Numbers",
  Deut: "Deuteronomy",
  Josh: "Joshua",
  Judg: "Judges",
  Ruth: "Ruth",
  Sam: "Samuel",
  Kgs: "Kings",
  Chr: "Chronicles",
  Ezra: "Ezra",
  Neh: "Nehemiah",
  Esth: "Esther",
  Job: "Job",
  Ps: "Psalms",
  Prov: "Proverbs",
  Eccl: "Ecclesiastes",
  Song: "Song of Solomon",
  Isa: "Isaiah",
  Jer: "Jeremiah",
  Lam: "Lamentations",
  Ezek: "Ezekiel",
  Dan: "Daniel",
  Hos: "Hosea",
  Joel: "Joel",
  Amos: "Amos",
  Obad: "Obadiah",
  Jonah: "Jonah",
  Mic: "Micah",
  Nah: "Nahum",
  Hab: "Habakkuk",
  Zeph: "Zephaniah",
  Hag: "Haggai",
  Zech: "Zechariah",
  Mal: "Malachi",
  Matt: "Matthew",
  Mark: "Mark",
  Luke: "Luke",
  John: "John",
  Acts: "Acts",
  Rom: "Romans",
  Cor: "Corinthians",
  Gal: "Galatians",
  Eph: "Ephesians",
  Phil: "Philippians",
  Col: "Colossians",
  Thess: "Thessalonians",
  Tim: "Timothy",
  Titus: "Titus",
  Phlm: "Philemon",
  Heb: "Hebrews",
  Jas: "James",
  Pet: "Peter",
  Jude: "Jude",
  Rev: "Revelation",
};

function expandBookName(abbrev: string): string {
  // Direct lookup first
  if (BOOK_NAMES[abbrev]) {
    return BOOK_NAMES[abbrev];
  }

  // Handle numeric prefixes like "1John", "2Cor" - separate number from book
  const match = abbrev.match(/^(\d+)\s*([A-Za-z].*)$/);
  if (match) {
    const [, numPrefix, bookPart] = match;
    if (BOOK_NAMES[bookPart]) {
      return `${numPrefix} ${BOOK_NAMES[bookPart]}`;
    }
  }

  return abbrev;
}

/** Convert OSIS reference to BibleGateway URL */
export function osisToGatewayUrl(osis: string, version = "WEB"): string {
  // Single verse: John.3.16
  const singleMatch = osis.match(/^([1-4]?)([A-Za-z]+)\.(\d+)\.(\d+)$/);
  if (singleMatch) {
    const [, num, book, chapter, verse] = singleMatch;
    const fullBook = expandBookName(book);
    const prefix = num ? `${num} ` : "";
    return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(`${prefix}${fullBook} ${chapter}:${verse}`)}&version=${version}`;
  }

  // Range: Gen.1.1-Gen.1.3
  const rangeMatch = osis.match(
    /^([1-4]?)([A-Za-z]+)\.(\d+)\.(\d+)-(?:[1-4]?[A-Za-z]+\.)?(\d+)\.(\d+)$/,
  );
  if (rangeMatch) {
    const [, num, book, ch1, v1, ch2, v2] = rangeMatch;
    const fullBook = expandBookName(book);
    const prefix = num ? `${num} ` : "";
    const range =
      ch1 === ch2 ? `${ch1}:${v1}-${v2}` : `${ch1}:${v1}-${ch2}:${v2}`;
    return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(`${prefix}${fullBook} ${range}`)}&version=${version}`;
  }

  // Fallback
  const search = osis.replace(/\./g, " ").replace(/(\d+)\s+(\d+)/g, "$1:$2");
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;
}

/** Convert OSIS to human-readable format (e.g., "John 3:16") */
export function osisToDisplay(osis: string): string {
  return osis
    .replace(/^([1-4])([A-Za-z]+)/, "$1 $2")
    .replace(/^([1-4]?\s?)([A-Za-z]+)/, (_, num, book) => {
      return `${num}${expandBookName(book)}`;
    })
    .replace(/\.(\d+)\.(\d+)/g, " $1:$2")
    .replace(/-[1-4]?[A-Za-z]+\.(\d+)\.(\d+)/g, "-$1:$2")
    .replace(/(\d+):(\d+)-\1:(\d+)/g, "$1:$2-$3");
}
