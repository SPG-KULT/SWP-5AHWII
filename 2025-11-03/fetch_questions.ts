#!/usr/bin/env -S deno run -A
/**
 * fetch_questions.ts
 *
 * Fetches questions from OpenTDB (URL provided in code or via CLI arg) and stores
 * them into the Prisma-generated SQLite DB (dev.db) using the sqlite3 CLI.
 *
 * Usage:
 *   deno run -A fetch_questions.ts "https://opentdb.com/api.php?amount=50&category=31"
 *
 * The script expects `opentdb_token.json` in the same folder (created by fetch_token.ts).
 */

const DB_PATH = new URL('./dev.db', import.meta.url).pathname;
const TOKEN_PATH = new URL('./opentdb_token.json', import.meta.url).pathname;

function sqlEscape(s: string) {
  return s.replace(/'/g, "''");
}

async function runSql(cmd: string) {
  // run sqlite3 via Deno.Command and return stdout (trimmed)
  const command = new Deno.Command('sqlite3', { args: [DB_PATH, cmd], stdout: 'piped', stderr: 'piped' });
  const { code, stdout, stderr } = await command.output();
  const outStr = new TextDecoder().decode(stdout).trim();
  const errStr = new TextDecoder().decode(stderr).trim();
  if (code !== 0) {
    throw new Error(`sqlite3 failed: ${errStr}`);
  }
  return outStr;
}

async function getOrCreateUniqueString(table: string, uniqueCol: string, uniqueVal: string, idCol = 'id') {
  const sel = `SELECT ${idCol} FROM ${table} WHERE ${uniqueCol} = '${sqlEscape(uniqueVal)}';`;
  const found = await runSql(sel);
  if (found) return found.split('\n')[0];
  const id = crypto.randomUUID();
  const ins = `INSERT INTO ${table} (${idCol}, ${uniqueCol}) VALUES ('${id}', '${sqlEscape(uniqueVal)}');`;
  await runSql(ins);
  return id;
}

async function getOrCreateCategory(name: string, opentdb_id: number) {
  // Prefer to find by exact name first (name is unique). If not found,
  // then try to find by opentdb_id (if a valid id > 0). If still not found,
  // insert a new Category. For responses that don't include an OpenTDB id
  // we avoid inserting opentdb_id = 0 for every row (that would collide);
  // instead generate a unique negative sentinel id.
  const selByName = `SELECT id FROM Category WHERE name = '${sqlEscape(name)}';`;
  const foundByName = await runSql(selByName);
  if (foundByName) return foundByName.split('\n')[0];

  if (opentdb_id && opentdb_id > 0) {
    const selById = `SELECT id FROM Category WHERE opentdb_id = ${opentdb_id};`;
    const foundById = await runSql(selById);
    if (foundById) {
      const id = foundById.split('\n')[0];
      // ensure the name is up-to-date
      await runSql(`UPDATE Category SET name='${sqlEscape(name)}' WHERE id='${id}';`);
      return id;
    }
  }

  // If no opentdb id is available, generate a unique negative sentinel to
  // store in the opentdb_id column so the uniqueness constraint isn't violated
  const insert_opentdb_id = (opentdb_id && opentdb_id > 0) ? opentdb_id : -(Date.now() + Math.floor(Math.random() * 1000));
  const id = crypto.randomUUID();
  const ins = `INSERT INTO Category (id, name, opentdb_id) VALUES ('${id}', '${sqlEscape(name)}', ${insert_opentdb_id});`;
  await runSql(ins);
  return id;
}

async function insertAnswer(answerText: string) {
  const id = crypto.randomUUID();
  const ins = `INSERT INTO Answer (id, answer) VALUES ('${id}', '${sqlEscape(answerText)}');`;
  await runSql(ins);
  return id;
}

async function insertQuestion(questionText: string, typeId: string, difficultyId: string, categoryId: string, correctAnswerId: string) {
  const id = crypto.randomUUID();
  const ins = `INSERT INTO Question (id, question, typeId, difficultyId, categoryId, correct_answer_id) VALUES ('${id}', '${sqlEscape(questionText)}', '${typeId}', '${difficultyId}', '${categoryId}', '${correctAnswerId}');`;
  await runSql(ins);
  return id;
}

async function insertIncorrectRelation(answerId: string, questionId: string) {
  const ins = `INSERT INTO "_IncorrectAnswers" ("A","B") VALUES ('${answerId}','${questionId}');`;
  await runSql(ins);
}

async function main() {
  // Default: fetch 50 questions from any category (no category filter)
  const urlArg = Deno.args[0] ?? 'https://opentdb.com/api.php?amount=50';
  // load token
  let token = undefined;
  try {
    const raw = await Deno.readTextFile(TOKEN_PATH);
    const obj = JSON.parse(raw);
    token = obj.token;
  } catch {
    console.error('Could not read token. Run fetch_token.ts first.');
    Deno.exit(2);
  }

  const url = urlArg + (urlArg.includes('?') ? '&' : '?') + `token=${token}`;
  console.log('Fetching questions from', url);
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Fetch failed', res.status, res.statusText);
    Deno.exit(3);
  }
  const body = await res.json();
  if (!body.results) {
    console.error('No results in response', body);
    Deno.exit(4);
  }

  for (const q of body.results) {
    // q: {category, type, difficulty, question, correct_answer, incorrect_answers[]}
    const typeId = await getOrCreateUniqueString('Type', 'name', q.type);
    const difficultyId = await getOrCreateUniqueString('Difficulty', 'level', q.difficulty);
    // opentdb category id is not provided directly in response; attempt to parse from category string if it contains '(#31)'
    // OpenTDB returns category as e.g. "Entertainment: Japanese Anime & Manga"
    // We don't have opentdb_id here; the schema requires opentdb_id unique, but we can insert with 0 if unknown.
    // Better: try to parse number from category if present, otherwise use 0.
    const parsed = q.category.match(/\((?:#)?(\d+)\)$/);
    const opentdb_id = parsed ? Number(parsed[1]) : 0;
    const categoryId = await getOrCreateCategory(q.category, opentdb_id);

    // insert correct answer
    const correctAnswerId = await insertAnswer(q.correct_answer);
    // insert question
    const questionId = await insertQuestion(q.question, typeId, difficultyId, categoryId, correctAnswerId);

    // insert incorrect answers and relations
    for (const ia of q.incorrect_answers) {
      const aid = await insertAnswer(ia);
      await insertIncorrectRelation(aid, questionId);
    }

    console.log(`Inserted question ${questionId}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  Deno.exit(1);
});
