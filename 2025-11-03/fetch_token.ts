#!/usr/bin/env -S deno run -A
/**
 * fetch_token.ts
 *
 * Requests a session token from OpenTDB and writes it to opentdb_token.json
 * Usage:
 *   deno run -A fetch_token.ts
 */

const TOKEN_URL = "https://opentdb.com/api_token.php?command=request";
const OUT_PATH = new URL("./opentdb_token.json", import.meta.url).pathname;

async function fetchToken() {
  console.log(`Requesting token from ${TOKEN_URL} ...`);
  const res = await fetch(TOKEN_URL);
  if (!res.ok) {
    console.error(`Failed to fetch token: ${res.status} ${res.statusText}`);
    Deno.exit(2);
  }
  const body = await res.json();
  // OpenTDB returns shape { response_code: 0, response_message: "", token: "..." }
  if (!body.token) {
    console.error("No token found in response:", body);
    Deno.exit(3);
  }
  const tokenRecord = {
    token: body.token,
    fetched_at: new Date().toISOString(),
    raw: body,
  };

  await Deno.writeTextFile(OUT_PATH, JSON.stringify(tokenRecord, null, 2));
  console.log(`Token saved to ${OUT_PATH}`);
  console.log(`Token: ${body.token}`);
}

fetchToken().catch((err) => {
  console.error("Error fetching token:", err);
  Deno.exit(1);
});
