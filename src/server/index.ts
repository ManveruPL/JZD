import { buildApp } from './app.js';

async function main() {
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  const { app, roomManager, questionsRepo } = await buildApp();

  try {
    await app.listen({ port, host });
    console.log(`\n========================================`);
    console.log(`🚀 JZD Server (Jeden z Dziesięciu)`);
    console.log(`📡 HTTP & Socket.IO: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(`📚 Baza pytań: ${questionsRepo.totalQuestionsCount} załadowanych pytań`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Błąd startu serwera:', err);
    process.exit(1);
  }
}

main();
