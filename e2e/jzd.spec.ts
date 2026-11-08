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

  test('5. Phase 4: Interactive Player submits answer on smartphone, Game Master verifies via 1-click panel', async ({ browser }) => {
    // 1. Host creates online room
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto('/');

    await hostPage.getByTestId('btn-create-room').click();
    const roomBadge = hostPage.getByTestId('room-code-badge');
    await expect(roomBadge).toBeVisible();
    const roomCode = await roomBadge.innerText();

    // 2. 4 players join to meet minimum requirement
    const playerContexts = [];
    const playerPages = [];
    const names = ['Katarzyna', 'Michał', 'Anna', 'Piotr'];

    for (const name of names) {
      const pContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const pPage = await pContext.newPage();
      await pPage.goto('/');
      await pPage.getByTestId('btn-open-join').click();
      await pPage.getByTestId('input-room-code').fill(roomCode);
      await pPage.getByTestId('input-player-name').fill(name);
      await pPage.getByTestId('btn-submit-join').click();
      await expect(pPage.locator('text=Jesteś w teleturnieju!')).toBeVisible();

      playerContexts.push(pContext);
      playerPages.push(pPage);
    }

    // 3. Host starts game
    const startBtn = hostPage.getByTestId('btn-start-game');
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Verify game starts in Stage 1
    await expect(hostPage.locator('text=Etap 1: Eliminacje')).toBeVisible();

    // 4. Find which player is active (player order is randomized at start)
    let activePlayerPage = playerPages[0];
    await expect.poll(async () => {
      for (const pPage of playerPages) {
        if (await pPage.locator('text=TWOJA KOLEJ NA ODPOWIEDŹ!').isVisible()) {
          activePlayerPage = pPage;
          return true;
        }
      }
      return false;
    }, { timeout: 10000 }).toBe(true);

    // Ensure active player view is loaded
    await expect(activePlayerPage.locator('text=TWOJA KOLEJ NA ODPOWIEDŹ!')).toBeVisible();

    // 5. Active player types answer on smartphone and submits
    const answerInput = activePlayerPage.getByTestId('input-contestant-answer');
    await expect(answerInput).toBeVisible();
    await answerInput.fill('Kopernik');
    await activePlayerPage.getByTestId('btn-submit-contestant-answer').click();

    // 6. Player sees submission confirmation
    const confirmEl = activePlayerPage.getByTestId('player-submitted-confirmation');
    await expect(confirmEl).toBeVisible();
    await expect(confirmEl).toContainText('Kopernik');

    // 7. Host sees Online Answer Verification Panel
    const hostSubmittedPanel = hostPage.getByTestId('host-submitted-answer-panel');
    await expect(hostSubmittedPanel).toBeVisible();
    await expect(hostPage.getByTestId('host-received-answer-text')).toContainText('Kopernik');

    // 8. Host verifies and accepts answer with 1 click
    const btnAccept = hostPage.getByTestId('btn-accept-submitted-answer');
    await expect(btnAccept).toBeVisible();
    await btnAccept.click();

    // 9. Host panel clears and game advances
    await expect(hostSubmittedPanel).not.toBeVisible();

    // Clean up contexts
    await hostContext.close();
    for (const ctx of playerContexts) {
      await ctx.close();
    }
  });

  test('6. Phase 5: Game Configuration options, sound controls, and results export buttons', async ({ page }) => {
    await page.goto('/');

    // Start Party Mode
    await page.getByTestId('btn-start-party').click();
    await expect(page.getByTestId('room-code-badge')).toBeVisible();

    // Verify Phase 5 Settings Section in Lobby
    const settingsPanel = page.getByTestId('lobby-game-settings');
    await expect(settingsPanel).toBeVisible();

    // Test clicking custom configuration options (20s answer limit, 5s buzzer, 30 final pool, 2 chances)
    const btnAnswer20 = page.getByTestId('btn-config-answer-20');
    await expect(btnAnswer20).toBeVisible();
    await btnAnswer20.click();

    const btnBuzzer5 = page.getByTestId('btn-config-buzzer-5');
    await expect(btnBuzzer5).toBeVisible();
    await btnBuzzer5.click();

    const btnFinal30 = page.getByTestId('btn-config-final-30');
    await expect(btnFinal30).toBeVisible();
    await btnFinal30.click();

    const btnChances2 = page.getByTestId('btn-config-chances-2');
    await expect(btnChances2).toBeVisible();
    await btnChances2.click();

    // Start game with custom config
    await page.getByTestId('btn-start-game').click();
    await expect(page.locator('text=Etap 1: Eliminacje')).toBeVisible();

    // Verify timer took 20s custom answer limit
    await expect(page.getByTestId('timer-display')).toContainText('20s');

    // Visual screenshot of custom-configured game
    const screenshot = await page.screenshot();
    expect(screenshot.byteLength).toBeGreaterThan(10000);
  });

  test('7. TV View in Interactive Mode: renders QR Code, PIN, and scan-to-join auto-fills room code', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const tvContext = await browser.newContext();
    const playerContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const tvPage = await tvContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Host creates an interactive / online room
    await hostPage.goto('/');
    await hostPage.getByTestId('btn-create-room').click();

    const roomBadge = hostPage.getByTestId('room-code-badge');
    await expect(roomBadge).toBeVisible();
    const roomCode = await roomBadge.innerText();
    expect(roomCode).toMatch(/^JZD-[A-Z0-9]{4}$/);

    // 2. Open TV screen for this room
    await tvPage.goto(`/?tv=${roomCode}`);

    // Verify TV Lobby in interactive mode displays QR Code and PIN
    await expect(tvPage.getByTestId('tv-lobby-interactive')).toBeVisible();
    const qrImage = tvPage.getByTestId('tv-qr-image');
    await expect(qrImage).toBeVisible();

    const tvRoomPin = tvPage.getByTestId('tv-room-pin');
    await expect(tvRoomPin).toContainText(roomCode);

    const countBadge = tvPage.getByTestId('tv-player-count-badge');
    await expect(countBadge).toContainText('0 /');

    // 3. Player scans QR code (navigates to encoded join link: /?join=ROOMCODE)
    await playerPage.goto(`/?join=${roomCode}`);

    // Verify room code input is pre-filled automatically
    const inputCode = playerPage.getByTestId('input-room-code');
    await expect(inputCode).toBeVisible();
    await expect(inputCode).toHaveValue(roomCode);

    // Fill player name and join
    const inputName = playerPage.getByTestId('input-player-name');
    await expect(inputName).toBeVisible();
    await inputName.fill('Krzysztof');
    await playerPage.locator('button[type="submit"]').click();

    // Player enters contestant view
    await expect(playerPage.locator('text=Krzysztof').first()).toBeVisible();

    // 4. Verify TV View updates in real time with joined contestant
    await expect(tvPage.locator('text=Krzysztof').first()).toBeVisible();
    await expect(countBadge).toContainText('1 /');

    // 5. Verify TV View Header QR modal toggle
    const btnToggleQr = tvPage.getByTestId('tv-btn-toggle-qr');
    await expect(btnToggleQr).toBeVisible();
    await btnToggleQr.click();

    const qrModal = tvPage.getByTestId('tv-qr-modal');
    await expect(qrModal).toBeVisible();
    await expect(qrModal).toContainText(roomCode);

    // Close modal via close button
    await tvPage.getByTestId('tv-btn-close-qr-modal').click();
    await expect(qrModal).not.toBeVisible();

    // Visual screenshot of TV screen with QR code and joined player
    const tvScreenshot = await tvPage.screenshot();
    expect(tvScreenshot.byteLength).toBeGreaterThan(10000);

    // Cleanup
    await hostContext.close();
    await tvContext.close();
    await playerContext.close();
  });

});
