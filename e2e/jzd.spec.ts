import { test, expect } from '@playwright/test';

test.describe('Jeden z Dziesięciu - E2E Suite', () => {

  test('1. Landing Page renders with Fira Sans, dark theme, and mode options', async ({ page }) => {
    await page.goto('/');

    // Check Page Title
    await expect(page).toHaveTitle(/Jeden z Dziesięciu/i);

    // Check Hero Header
    const heading = page.locator('h1');
    await expect(heading).toContainText(/Jeden z Dziesięciu/i);

    // Check Question Counter Badge
    const badge = page.locator('text=11 047');
    await expect(badge).toBeVisible();

    // Check Mode Cards
    const partyCard = page.getByTestId('card-party-mode');
    const onlineCard = page.getByTestId('card-online-mode');
    await expect(partyCard).toBeVisible();
    await expect(onlineCard).toBeVisible();

    // Verify styling & typography
    const fontFamily = await heading.evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain('fira sans');

    const bodyBg = await page.locator('body').evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bodyBg).toBe('rgb(0, 0, 0)');

    // Visual screenshot verification
    const screenshot = await page.screenshot();
    expect(screenshot.byteLength).toBeGreaterThan(10000);
  });

  test('2. Party Mode: setup, launch Stage 1, timer display, and Game Master verdict flow', async ({ page }) => {
    await page.goto('/');

    // Start Party Mode
    await page.getByTestId('btn-start-party').click();

    // Wait for Host View with room code
    const roomBadge = page.getByTestId('room-code-badge');
    await expect(roomBadge).toBeVisible();
    const roomCode = await roomBadge.innerText();
    expect(roomCode).toMatch(/^JZD-[A-Z0-9]{4}$/);

    // Verify Lobby allows starting
    const startBtn = page.getByTestId('btn-start-game');
    await expect(startBtn).toBeEnabled();

    // Launch game
    await startBtn.click();

    // Verify Stage 1 is active
    await expect(page.locator('text=Etap 1: Eliminacje')).toBeVisible();

    // Verify Question and Answer Spoiler Box for Game Master
    const questionEl = page.getByTestId('host-question-text');
    await expect(questionEl).toBeVisible();
    const questionText = await questionEl.innerText();
    expect(questionText.length).toBeGreaterThan(5);

    const answerBox = page.getByTestId('host-answer-box');
    await expect(answerBox).toBeVisible();
    await expect(answerBox).toContainText('Prawidłowa odpowiedź');

    // Verify 30-second Timer Display
    const timerDisplay = page.getByTestId('timer-display');
    await expect(timerDisplay).toBeVisible();

    // Verify Verdict Buttons
    const btnCorrect = page.getByTestId('btn-verdict-correct');
    const btnWrong = page.getByTestId('btn-verdict-wrong');
    await expect(btnCorrect).toBeVisible();
    await expect(btnWrong).toBeVisible();

    // Test Verdict: Correct answer
    await btnCorrect.click();

    // Test Verdict: Wrong answer (should take 1 chance)
    await page.waitForTimeout(300);
    await btnWrong.click();

    // Visual snapshot of Host Dashboard during game
    const hostScreenshot = await page.screenshot();
    expect(hostScreenshot.byteLength).toBeGreaterThan(10000);
  });

  test('3. TV View: Displays studio layout with question and timer without answers', async ({ page, browser }) => {
    // 1. Host creates party game
    await page.goto('/');
    await page.getByTestId('btn-start-party').click();
    const roomBadge = page.getByTestId('room-code-badge');
    await expect(roomBadge).toBeVisible();
    const roomCode = await roomBadge.innerText();

    await page.getByTestId('btn-start-game').click();
    await expect(page.locator('text=Etap 1: Eliminacje')).toBeVisible();

    // 2. Open TV View in another context
    const tvContext = await browser.newContext();
    const tvPage = await tvContext.newPage();
    await tvPage.goto(`/?tv=${roomCode}`);

    // Verify TV Studio Header
    await expect(tvPage.locator('text=Studio Teleturniejowe')).toBeVisible();

    // Verify Question is shown on TV
    const tvQuestion = tvPage.getByTestId('tv-question-text');
    await expect(tvQuestion).toBeVisible();

    // Critical teleturniej rule: Expected answer must NEVER be shown on TV view!
    const tvAnswerBox = tvPage.getByTestId('host-answer-box');
    await expect(tvAnswerBox).not.toBeVisible();

    // Verify Timer on TV
    await expect(tvPage.getByTestId('timer-display')).toBeVisible();

    // Visual screenshot of TV screen
    const tvScreenshot = await tvPage.screenshot();
    expect(tvScreenshot.byteLength).toBeGreaterThan(10000);

    await tvContext.close();
  });

  test('4. Online Mode: Player joins via PIN, sees lobby, and receives active game updates', async ({ browser }) => {
    // 1. Host creates online room
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto('/');

    await hostPage.getByTestId('btn-create-room').click();
    const roomBadge = hostPage.getByTestId('room-code-badge');
    await expect(roomBadge).toBeVisible();
    const roomCode = await roomBadge.innerText();

    // 2. Player joins from mobile browser
    const playerContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 mobile viewport
    });
    const playerPage = await playerContext.newPage();
    await playerPage.goto('/');

    await playerPage.getByTestId('btn-open-join').click();
    await playerPage.getByTestId('input-room-code').fill(roomCode);
    await playerPage.getByTestId('input-player-name').fill('Tomasz');
    await playerPage.getByTestId('btn-submit-join').click();

    // Player should see waiting lobby
    await expect(playerPage.locator('text=Jesteś w teleturnieju!')).toBeVisible();
    await expect(playerPage.getByRole('heading', { name: 'Tomasz' })).toBeVisible();

    // Visual snapshot of mobile player screen
    const playerScreenshot = await playerPage.screenshot();
    expect(playerScreenshot.byteLength).toBeGreaterThan(5000);

    await hostContext.close();
    await playerContext.close();
  });

});
