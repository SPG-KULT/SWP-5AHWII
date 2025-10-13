import {fakerDE_AT} from "@faker-js/faker";
import { PrismaClient } from "./prisma/client/index.js";



function main() {
  const music_faker = fakerDE_AT.music;
console.log("random music genre:", music_faker.genre());
console.log("random music artist:", music_faker.artist());
console.log("random music song name:", music_faker.songName());
console.log("random music album:", music_faker.album());
}
main();
