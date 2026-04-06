import { prisma } from "../lib/prisma";

async function main() {
    const usuarios = await prisma.usuario.findMany();
    console.log(JSON.stringify(usuarios, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });