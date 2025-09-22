import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  const easy = await prisma.difficulty.upsert({
    where: { level: 'easy' },
    update: {},
    create: { level: 'easy' },
  });
  const medium = await prisma.difficulty.upsert({
    where: { level: 'medium' },
    update: {},
    create: { level: 'medium' },
  });
  const hard = await prisma.difficulty.upsert({
    where: { level: 'hard' },
    update: {},
    create: { level: 'hard' },
  });

  const multiple = await prisma.type.upsert({
    where: { name: 'multiple' },
    update: {},
    create: { name: 'multiple' },
  });
  const booleanType = await prisma.type.upsert({
    where: { name: 'boolean' },
    update: {},
    create: { name: 'boolean' },
  });

  const category = await prisma.category.upsert({
    where: { opentdb_id: 31 },
    update: {},
    create: { name: 'Anime & Manga', opentdb_id: 31 },
  });

  // OpenTDB fetch
  const response = await fetch('https://opentdb.com/api.php?amount=10&category=31');
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const { results } = await response.json() as { results: any[] };

  // save data
  for (const q of results) {
    const difficulty = await prisma.difficulty.findUnique({ where: { level: q.difficulty } });
    const type = await prisma.type.findUnique({ where: { name: q.type } });


    const correct = await prisma.answer.create({ data: { answer: q.correct_answer } });

   
    const incorrectAnswers = [];
    for (const ia of q.incorrect_answers) {
      const inc = await prisma.answer.create({ data: { answer: ia } });
      incorrectAnswers.push(inc);
    }

    
    await prisma.question.create({
      data: {
        question: q.question,
        typeId: type!.id,
        difficultyId: difficulty!.id,
        categoryId: category.id,
        correct_answer_id: correct.id,
        incorrect_answers: {
          connect: incorrectAnswers.map(a => ({ id: a.id })),
        },
      },
    });
  }
}

main()
  .then(async () => {
    console.log('✅ Seed erfolgreich abgeschlossen');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Fehler beim Seeden:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
