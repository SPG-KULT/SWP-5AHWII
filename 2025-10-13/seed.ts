import {fakerDE_AT} from "@faker-js/faker";
import { PrismaClient } from "./prisma/client/client.ts";



async function seedMusicData() {
  const prisma = new PrismaClient();
  try {
    for (let i = 0; i < 100; i++) {
      await prisma.music.create({
        data: {
          genre: fakerDE_AT.music.genre(),
          artist: fakerDE_AT.music.artist(),
          songName: fakerDE_AT.music.songName(),
          album: fakerDE_AT.music.album(),
        },
      });
    }
    console.log('Seeded music data successfully.');
  } catch (error) {
    console.error('Error seeding music data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMusicData();