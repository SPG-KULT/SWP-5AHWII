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

  // We'll fetch in batches until the API signals no more questions.
  // If the provided URL already contains an amount parameter, we'll use it; otherwise default to 50.
  const hasAmount = /(?:\?|&)amount=\d+/.test(urlArg);
  const batchSize = hasAmount ? Number((urlArg.match(/(?:\?|&)amount=(\d+)/) || [])[1]) || 50 : 50;

  let nextUrlBase = urlArg.replace(/(\?|&)token=[^&]*/g, '');
  if (!nextUrlBase) nextUrlBase = urlArg;

  let insertedCount = 0;
  let skippedCount = 0;
  let round = 0;

  while (true) {
    round++;
    const sep = nextUrlBase.includes('?') ? '&' : '?';
    const amountPart = /(?:\?|&)amount=\d+/.test(nextUrlBase) ? '' : `${sep}amount=${batchSize}`;
    const url = `${nextUrlBase}${amountPart}${amountPart ? '&' : sep}token=${token}`;

    console.log(`[round ${round}] Fetching ${batchSize} questions from`, url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Fetch failed', res.status, res.statusText);
      Deno.exit(3);
    }
    const body = await res.json();

    const code = body.response_code;
    if (code === 3) {
      console.error('Token not found. Please fetch a new token with fetch_token.ts');
      Deno.exit(5);
    }
    if (code === 4) {
      console.log('Token has returned all available questions for this query (response_code=4). Stopping.');
      break;
    }
    if (code === 1) {
      console.log('No results for this query (response_code=1). Stopping.');
      break;
    }
    if (!body.results || body.results.length === 0) {
      console.log('No results returned. Stopping.');
      break;
    }

    for (const q of body.results) {
      // q: {category, type, difficulty, question, correct_answer, incorrect_answers[]}
      // deduplicate by exact question text
      const existing = await runSql(`SELECT id FROM Question WHERE question = '${sqlEscape(q.question)}';`);
      if (existing) {
        skippedCount++;
        continue;
      }

      const typeId = await getOrCreateUniqueString('Type', 'name', q.type);
      const difficultyId = await getOrCreateUniqueString('Difficulty', 'level', q.difficulty);
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

      insertedCount++;
      console.log(`Inserted question ${questionId}`);
    }

   
    console.log('Waiting 5 seconds before next batch...');
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log(`Done. Inserted: ${insertedCount}, Skipped (duplicates): ${skippedCount}`);
}

main().catch((err) => {
  console.error(err);
  Deno.exit(1);
});
