import { GameStage, GameState, Player } from '../../types/index.js';

export function getRankedPlayers(players: Player[], winner: Player | null): (Player & { rank: number })[] {
  const sorted = [...players].sort((a, b) => {
    // Winner always 1st
    if (winner && a.id === winner.id) return -1;
    if (winner && b.id === winner.id) return 1;

    // By points descending
    if (b.score !== a.score) return b.score - a.score;

    // By remaining chances descending
    if (b.chances !== a.chances) return b.chances - a.chances;

    // By accuracy descending
    const accA = a.stats?.accuracy || 0;
    const accB = b.stats?.accuracy || 0;
    return accB - accA;
  });

  return sorted.map((p, idx) => ({ ...p, rank: idx + 1 }));
}

export function formatStageName(stage?: GameStage | null): string {
  switch (stage) {
    case GameStage.STAGE_1:
      return 'Etap 1: Eliminacje';
    case GameStage.STAGE_2:
      return 'Etap 2: Wskazywanie';
    case GameStage.STAGE_3:
      return 'Etap 3: Wielki Finał';
    case GameStage.FINISHED:
      return 'Zwycięzca';
    default:
      return 'W grze / Finał';
  }
}

export function generateCSV(gameState: GameState): string {
  const ranked = getRankedPlayers(gameState.players, gameState.winner);

  const headers = [
    'Miejsce',
    'Zawodnik',
    'Stanowisko',
    'Punkty',
    'Szansy Koncowe',
    'Odpowiedzi Lacznie',
    'Poprawne',
    'Bledne',
    'Skutecznosc (%)',
    'Bral na siebie (Finał)',
    'Status / Etap Odpadniecia'
  ];

  const rows = ranked.map((p) => {
    const isWinner = gameState.winner?.id === p.id;
    const statusText = isWinner ? 'ZWYCIĘZCA' : formatStageName(p.stats?.eliminatedInStage);

    return [
      p.rank,
      `"${p.name.replace(/"/g, '""')}"`,
      p.position || 1,
      p.score,
      p.chances,
      p.stats?.totalAnswers || 0,
      p.stats?.correctAnswers || 0,
      p.stats?.wrongAnswers || 0,
      `${p.stats?.accuracy || 0}%`,
      p.stats?.selfNominations || 0,
      `"${statusText}"`
    ].join(';');
  });

  return [headers.join(';'), ...rows].join('\r\n');
}

export function generateMarkdownReport(gameState: GameState): string {
  const ranked = getRankedPlayers(gameState.players, gameState.winner);
  const summary = gameState.gameStats;
  const dateStr = new Date().toLocaleString('pl-PL');

  const lines: string[] = [
    `# 🏆 Raport Końcowy Teleturnieju: Jeden z Dziesięciu`,
    `**Kod Pokoju:** \`${gameState.id}\` | **Data:** ${dateStr}\n`,
    `## 📊 Podsumowanie Rozgrywki`,
    `- **Zwycięzca:** 🥇 **${gameState.winner?.name || 'Brak'}** (${gameState.winner?.score || 0} pkt)`,
    `- **Czas trwania:** ${summary?.durationSeconds ? `${Math.floor(summary.durationSeconds / 60)}m ${summary.durationSeconds % 60}s` : 'b.d.'}`,
    `- **Zadane pytania:** ${summary?.totalQuestionsAsked || gameState.history.filter(h => h.type.includes('QUESTION') || h.type === 'NOMINATED').length || 0}`,
    `- **Średnia celność odpowiedzi:** ${summary?.overallAccuracy || 0}%\n`,
    `## 🏅 Tabela Wyników Końcowych\n`,
    `| M-ce | Zawodnik | Stanowisko | Punkty | Szanse | Poprawne / Wszystkie | Celność | Status |`,
    `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |`
  ];

  for (const p of ranked) {
    const isWinner = gameState.winner?.id === p.id;
    const medal = p.rank === 1 ? '🥇 ' : p.rank === 2 ? '🥈 ' : p.rank === 3 ? '🥉 ' : '';
    const status = isWinner ? '**ZWYCIĘZCA**' : formatStageName(p.stats?.eliminatedInStage);
    const answers = `${p.stats?.correctAnswers || 0} / ${p.stats?.totalAnswers || 0}`;

    lines.push(
      `| ${medal}${p.rank} | **${p.name}** | #${p.position || 1} | **${p.score} pkt** | ${p.chances} | ${answers} | ${p.stats?.accuracy || 0}% | ${status} |`
    );
  }

  lines.push('\n---\n*Wygenerowano automatycznie przez platformę JZD.*');
  return lines.join('\n');
}

export function generateJSON(gameState: GameState): string {
  const ranked = getRankedPlayers(gameState.players, gameState.winner);

  const exportData = {
    gameId: gameState.id,
    generatedAt: new Date().toISOString(),
    config: gameState.config,
    summary: gameState.gameStats || {
      winner: gameState.winner?.name,
      finalScore: gameState.winner?.score
    },
    standings: ranked.map((p) => ({
      rank: p.rank,
      name: p.name,
      position: p.position || 1,
      score: p.score,
      finalChances: p.chances,
      stats: p.stats,
      isWinner: gameState.winner?.id === p.id
    })),
    history: gameState.history
  };

  return JSON.stringify(exportData, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8'): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // Fallback
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}
