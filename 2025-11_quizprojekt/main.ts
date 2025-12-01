import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { questionsDifficultyCategoryAmount } from "./lib/questionservice.ts";

const app = new Hono();

// Serve static files from public directory
app.use("/*", serveStatic({ root: "./public" }));

// API endpoint for questions
app.get("/questions", async (c) => {
    // difficulty=easy&category=Sports&amount=3
    const difficulty = c.req.query("difficulty");
    const category = c.req.query("category");
    if (!difficulty || !category) {
        return c.json({ error: "Missing difficulty or category parameter" }, 400);
    }
    const amount = parseInt(c.req.query("amount") || "1");
    return c.json(await questionsDifficultyCategoryAmount(difficulty, category, amount));
});
Deno.serve({ port: 5000 }, app.fetch);
