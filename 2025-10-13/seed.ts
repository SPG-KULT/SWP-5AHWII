import { fakerDE_AT } from "@faker-js/faker";
import { PrismaClient } from "./prisma/client/client.ts";

async function seedMusicData() {
  const prisma = new PrismaClient();
  try {
    // Create genres
    const genres: Array<{ id: string; name: string }> = [];
    for (let i = 0; i < 10; i++) {
      const genre = await prisma.genre.create({
        data: {
          name: fakerDE_AT.music.genre(),
        },
      });
      genres.push(genre);
    }
    console.log(`Created ${genres.length} genres.`);

    // Create artists
    const artists: Array<{ id: string; name: string }> = [];
    for (let i = 0; i < 20; i++) {
      const artist = await prisma.artist.create({
        data: {
          name: fakerDE_AT.person.fullName(),
        },
      });
      artists.push(artist);
    }
    console.log(`Created ${artists.length} artists.`);

    // Create albums with artists
    const albums: Array<{ id: string; name: string; erscheinungsjahr: number }> = [];
    for (let i = 0; i < 30; i++) {
      // Randomly select 1-3 artists for the album
      const numArtists = Math.floor(Math.random() * 3) + 1;
      const selectedArtists: Array<{ id: string; name: string }> = [];
      for (let j = 0; j < numArtists; j++) {
        const randomArtist = artists[Math.floor(Math.random() * artists.length)];
        if (!selectedArtists.find((a) => a.id === randomArtist.id)) {
          selectedArtists.push(randomArtist);
        }
      }

      const album = await prisma.album.create({
        data: {
          name: fakerDE_AT.music.album(),
          erscheinungsjahr: fakerDE_AT.number.int({ min: 1960, max: 2025 }),
          artists: {
            connect: selectedArtists.map((a) => ({ id: a.id })),
          },
        },
      });
      albums.push(album);
    }
    console.log(`Created ${albums.length} albums.`);

    // Create songs
    for (let i = 0; i < 100; i++) {
      // Randomly select an album
      const randomAlbum = albums[Math.floor(Math.random() * albums.length)];
      
      // Randomly select 1-4 artists for the song
      const numArtists = Math.floor(Math.random() * 4) + 1;
      const selectedArtists: Array<{ id: string; name: string }> = [];
      for (let j = 0; j < numArtists; j++) {
        const randomArtist = artists[Math.floor(Math.random() * artists.length)];
        if (!selectedArtists.find((a) => a.id === randomArtist.id)) {
          selectedArtists.push(randomArtist);
        }
      }

      // Randomly select a genre (optional)
      const randomGenre = Math.random() > 0.2 ? genres[Math.floor(Math.random() * genres.length)] : null;

      await prisma.song.create({
        data: {
          name: fakerDE_AT.music.songName(),
          duration: fakerDE_AT.number.int({ min: 120, max: 420 }), // 2-7 minutes in seconds
          album: {
            connect: { id: randomAlbum.id },
          },
          artists: {
            connect: selectedArtists.map((a) => ({ id: a.id })),
          },
          ...(randomGenre && {
            genre: {
              connect: { id: randomGenre.id },
            },
          }),
        },
      });
    }
    console.log('Created 100 songs.');
    console.log('Seeded music data successfully.');
  } catch (error) {
    console.error('Error seeding music data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMusicData();