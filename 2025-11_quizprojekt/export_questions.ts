#!/usr/bin/env -S deno run -A

import { PrismaClient } from "./prisma/client/client.ts";

const dbPath = new URL("./dev.db", import.meta.url).pathname;
Deno.env.set("DATABASE_URL", `file:${dbPath}`);

const prisma = new PrismaClient();

try {
    const questions = await prisma.question.findMany({
        include: {
            difficulty: true,
            category: true,
            type: true,
            correct_answer: true,
            incorrect_answers: true,
        },
    });

    const exportData = questions.map((q) => ({
        question: q.question,
        difficulty: q.difficulty.level,
        category: q.category.name,
        type: q.type.name,
        correct_answer: q.correct_answer.answer,
        incorrect_answers: q.incorrect_answers.map((a) => a.answer),
    }));

    await Deno.writeTextFile("./public/questions.json", JSON.stringify(exportData, null, 2));

    console.log(`Exported ${exportData.length} questions`);
} catch (error) {
    console.error("Error:", error.message);
    Deno.exit(1);
} finally {
    await prisma.$disconnect();
}
