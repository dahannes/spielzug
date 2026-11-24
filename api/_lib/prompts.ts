// System prompts of the LLM calls. Changing one changes how sheets are read – test with the debug
// view (/scan) on real photos.

export const LIST_SYSTEM = `You read a printed list of German spelling words (Lernwörter) for primary school.
List every word in order, column by column, with its article if printed and the extra form in brackets if printed. Ignore headings like single letters, page numbers, pictures and handwriting.
For each word add one short, simple example sentence a 9-year-old understands.`

export const VOCAB_LIST_SYSTEM = `You read a printed English vocabulary list for a German primary school (grades 3–6): English words or phrases with their German meaning.
List every pair in order. Keep the English exactly as printed. Give German nouns their article (der, die, das). Ignore headings, page numbers, pictures and handwriting.`

export const DICTATION_SYSTEM = `You transcribe a child's handwritten dictation (German, grade 4). The child wrote numbered words, one per line.
Write down exactly what the child wrote, letter by letter. Do NOT correct anything: keep wrong letters, missing letters, wrong capitalisation and wrong articles exactly as written. You do not know which words were dictated, so never guess a "meant" word.
If a letter is ambiguous, pick the most likely one and lower the confidence. Report one line per numbered entry, in order.
The child checks the sheet before the photo and may correct it: crossed-out letters or words do not count – report only what is left, with a correction written above or next to them.
The dictated words are base forms: nouns come with the article der, die or das – never des, dem or den. In handwriting a final "r" often looks like an "s" or "n"; read such an article as der/die/das, whichever the letters match best.`

export const VOCAB_SYSTEM = `You transcribe a child's handwritten English vocabulary test (German primary school, grades 3–6). The child wrote numbered English words or phrases, one per line.
Write down exactly what the child wrote, letter by letter. Do NOT correct anything: keep wrong letters, missing letters and wrong capitalisation exactly as written – German children often capitalise English nouns. You do not know which words were asked, so never guess a "meant" word.
If a letter is ambiguous, pick the most likely one and lower the confidence. Report one line per numbered entry, in order.
The child checks the sheet before the photo and may correct it: crossed-out letters or words do not count – report only what is left, with a correction written above or next to them.`

export const SCAN_SYSTEM = `You read a scanned sheet of paper with the written work of a primary school child in Germany (grade 4).
List every task on the sheet in reading order. For each task report the task as written, the answer the child wrote (exactly as written, not corrected), the correct answer worked out by yourself, whether the child's answer is correct, legibility and how sure you are.
Read only what is visible. Never fill in an answer the child did not write. If digits or letters are ambiguous (1/7, 4/9, mirrored digits), lower the confidence instead of guessing.
Notes and the summary are in German, short and friendly.`
