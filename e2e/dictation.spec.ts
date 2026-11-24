import { expect, test, type Page } from '@playwright/test'
import { acceptPhoto, checkSheet, chooseClub, enterTrainerArea, setShirtNumber, kickOff, PASSWORD, signUpAndStart, uploadSkewedSheet } from './helpers.ts'
import { readLoginCode, uniqueEmail } from './mailpit.ts'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../shared/database.types.ts'
import { PLAYER_SCHEMES } from '../src/features/children/schemes.ts'

test('[SR-11][SR-22][SR-24][SR-31][SR-33][SR-34][SR-51][SR-53][SR-60][SR-61] parents type a word list; a full training ends in the report with its photo and fills the player card', async ({ page }) => {
  await signUpAndStart(page)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Noch keine Wörterliste für Klasse 4.')).toBeVisible()

  // List: typed (the photo path is tested below)
  await page.getByRole('link', { name: '+ Neue Wörterliste' }).click()
  await expect(page).toHaveURL(/\/dictation\/lists\/new$/)
  await page.getByText('Oder Wörter eintippen').click()
  await page.getByLabel('Wörter, eins pro Zeile').fill('der Hund\nelf\nviele (vieles)\ndie Wiese\ndas Fenster\nrot\nlaufen (läuft)\ndie Sonne\nsüß\nder Wald')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await expect(page.getByText('10 Wörter')).toBeVisible()
  await page.getByLabel('Name der Liste').fill('Lernwörter B')
  await page.getByRole('button', { name: 'Liste speichern' }).click()
  await expect(page.getByText('0 von 10 Wörtern sicher')).toBeVisible()

  // Round: 10 words, one after another, then the scan
  await page.getByRole('button', { name: '▶ Diktat starten' }).click()
  await expect(page).toHaveURL(/\/dictation\/rounds\/[0-9a-f-]+$/)
  await kickOff(page)
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByText(`Wort ${i} von 10`)).toBeVisible()
    await page.getByRole('button', { name: i < 10 ? 'Weiter →' : 'Abpfiff – Foto machen' }).click()
  }
  await checkSheet(page)
  await uploadSkewedSheet(page)
  await acceptPhoto(page)

  // AI_FAKE reads "die Wise" on every line: one is the ie mistake, the rest are wrong words
  const sheet = page.getByLabel('Korrektur')
  await expect(sheet).toBeVisible({ timeout: 20_000 })
  await expect(sheet.getByText('0/10')).toBeVisible()
  await expect(sheet.getByText('ie!')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Berichtigung' })).toBeVisible()

  // The photo is kept with the report; on the phone it sits behind the "Foto" tab
  const photoTab = page.getByRole('tab', { name: 'Foto' })
  if (await photoTab.isVisible()) await photoTab.click()
  await expect(page.getByRole('img', { name: 'Foto des Diktatblatts' })).toBeVisible()
  await page.getByRole('button', { name: 'Foto im Vollbild öffnen' }).click()
  const photo = page.getByRole('dialog', { name: 'Foto vom Blatt' })
  await photo.getByRole('button', { name: 'Vergrößern' }).click()
  await expect(photo.getByRole('button', { name: 'Verkleinern' })).toBeEnabled()
  await photo.getByRole('button', { name: 'Schließen' }).click()
  await expect(photo).toBeHidden()

  // The Spielvorbereitung lists the game and starts the next one
  await page.getByRole('link', { name: 'Spielvorbereitung', exact: true }).click()
  await expect(page).toHaveURL(/\/training\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: 'Lernwörter B', level: 1 })).toBeVisible()
  await expect(page.getByRole('img', { name: '0 von 10 Wörtern sicher' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Spiele' }).getByRole('link', { name: /^Spiel 1, .*, \d+ von 10 richtig$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Training starten: Lernwörter B' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false) // [SR-50]

  // The player card counts the checked round
  await page.getByRole('link', { name: '← Trainingsplan' }).click()
  const card = page.getByRole('article', { name: 'Spielerkarte Max' })
  await expect(card.getByText('Mittelfeld · Klasse 4')).toBeVisible() // every player starts in midfield
  await expect(card.getByRole('definition').nth(0)).toHaveText('0/10')
  await expect(card.getByRole('definition').nth(1)).toHaveText('0 %')
  await expect(card.getByRole('definition').nth(2)).toHaveText('1 Tag')
  await expect(card.getByRole('definition').nth(3)).not.toHaveText('–') // AI_FAKE reads the same word everywhere: some spelling kind wins
  // the card's bar only shows; the card opens the Spielvorbereitung
  await expect(page.getByRole('article', { name: 'Lernwörter B' }).getByRole('img', { name: '0 von 10 Wörtern sicher' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Lernwörter B' }).getByRole('link')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false) // [SR-50]
})

test('[SR-34][SR-64] each game is a segment of the progress bar; the Spielvorbereitung opens its report', async ({ page }) => {
  await signUpAndStart(page)
  await page.getByRole('link', { name: '+ Neue Wörterliste' }).click()
  await page.getByText('Oder Wörter eintippen').click()
  // AI_FAKE reads "die Wise" on every line: here that is one of the two words
  await page.getByLabel('Wörter, eins pro Zeile').fill('die Wise\nelf')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await page.getByLabel('Name der Liste').fill('Lernwörter A')
  await page.getByRole('button', { name: 'Liste speichern' }).click()
  await page.getByRole('button', { name: '▶ Diktat starten' }).click()
  await kickOff(page)
  await page.getByRole('button', { name: 'Weiter →' }).click()
  await page.getByRole('button', { name: 'Abpfiff – Foto machen' }).click()
  await checkSheet(page)
  await uploadSkewedSheet(page)
  await acceptPhoto(page)
  await expect(page.getByLabel('Korrektur')).toBeVisible({ timeout: 20_000 })

  await page.getByRole('link', { name: 'Spielvorbereitung', exact: true }).click()
  await expect(page.getByRole('img', { name: '1 von 2 Wörtern sicher' })).toBeVisible()
  // the word the game made secure is marked
  await expect(page.getByRole('region', { name: /^Wörter/ }).getByText('(sicher)')).toHaveCount(1)
  const game = page.getByRole('region', { name: 'Spiele' }).getByRole('link', { name: /^Spiel 1,/ })
  await expect(game).toHaveAccessibleName(/^Spiel 1, .*, 1 von 2 richtig$/)
  await game.click()
  await expect(page).toHaveURL(/\/dictation\/rounds\/[0-9a-f-]+$/)
  await expect(page.getByLabel('Korrektur')).toBeVisible()
})

test('[SR-25] a Berichtigung: look, cover, write, compare, photo – graded, but no Tore', async ({ page }) => {
  await signUpAndStart(page)
  await page.getByRole('link', { name: '+ Neue Wörterliste' }).click()
  await page.getByText('Oder Wörter eintippen').click()
  // AI_FAKE reads "die Wise" on every line: right for the first word, wrong for "elf"
  await page.getByLabel('Wörter, eins pro Zeile').fill('die Wise\nelf')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await page.getByLabel('Name der Liste').fill('Lernwörter A')
  await page.getByRole('button', { name: 'Liste speichern' }).click()
  await page.getByRole('button', { name: '▶ Diktat starten' }).click()
  await kickOff(page)
  await page.getByRole('button', { name: 'Weiter →' }).click()
  await page.getByRole('button', { name: 'Abpfiff – Foto machen' }).click()
  await checkSheet(page)
  await uploadSkewedSheet(page)
  await acceptPhoto(page)
  await expect(page.getByLabel('Korrektur')).toBeVisible({ timeout: 20_000 })
  const report = page.url()

  // Only the wrong word, one step after another
  await page.getByRole('button', { name: '✏️ Berichtigung starten' }).click()
  await expect(page.getByRole('heading', { name: 'Berichtigung' })).toBeVisible()
  await expect(page.getByText('1 Wort aus deinem Diktat.')).toBeVisible()
  await page.getByRole('button', { name: "▶ Los geht's" }).click()
  await expect(page.getByText('Wort 1 von 1')).toBeVisible()
  await expect(page.getByText('elf', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '✋ Abdecken' }).click()
  await expect(page.getByText('elf', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '👀 Vergleichen' }).click()
  await expect(page.getByText('elf', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fertig – Foto machen' }).click()
  await uploadSkewedSheet(page)
  await acceptPhoto(page)

  // Graded like a dictation; still wrong: go again with the words still wrong
  const sheet = page.getByLabel('Korrektur')
  await expect(sheet.getByRole('heading', { name: /^Berichtigung · Max/ })).toBeVisible({ timeout: 20_000 })
  await expect(sheet.getByText('0/1')).toBeVisible()
  await expect(page.getByText('Neue Tore')).toHaveCount(0)
  await expect(page.getByText(/Noch 1 Wort\./)).toBeVisible()
  await expect(page.getByRole('button', { name: '✏️ Nochmal berichtigen' })).toBeVisible()
  await page.getByRole('link', { name: '← Spielbericht' }).click()
  expect(page.url()).toBe(report)
  await expect(page.getByRole('link', { name: 'Letzte Berichtigung ansehen' })).toBeVisible()

  // Tore and the bar count dictations only
  await page.getByRole('link', { name: 'Spielvorbereitung', exact: true }).click()
  await expect(page.getByRole('img', { name: '1 von 2 Wörtern sicher' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Spiele' }).getByRole('link', { name: /^Spiel \d/ })).toHaveCount(1)
})

test('[SR-22][SR-24][SR-25] a double tap moves one word; a reload reopens the round and the Berichtigung where they were', async ({ page }) => {
  await signUpAndStart(page)
  await page.getByRole('link', { name: '+ Neue Wörterliste' }).click()
  await page.getByText('Oder Wörter eintippen').click()
  // AI_FAKE reads "die Wise" on every line: two words stay wrong for the Berichtigung
  await page.getByLabel('Wörter, eins pro Zeile').fill('die Wise\nelf\nrot')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await page.getByLabel('Name der Liste').fill('Lernwörter A')
  await page.getByRole('button', { name: 'Liste speichern' }).click()
  await page.getByRole('button', { name: '▶ Diktat starten' }).click()
  await kickOff(page)

  // a double tap on Weiter skips no word
  await expect(page.getByText('Wort 1 von 3')).toBeVisible()
  await page.getByRole('button', { name: 'Weiter →' }).dblclick()
  await expect(page.getByText('Wort 2 von 3')).toBeVisible()
  await page.waitForTimeout(800)
  await expect(page.getByText('Wort 2 von 3')).toBeVisible()

  // a reload keeps the word, without the preparation; the child replays it
  await page.reload()
  await expect(page.getByText('Wort 2 von 3')).toBeVisible()
  await expect(page.getByRole('status')).toContainText("Weiter geht's mit Wort 2")
  await expect(page.getByRole('heading', { name: 'Trainings-Vorbereitung' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Weiter →' }).click()
  await page.getByRole('button', { name: 'Abpfiff – Foto machen' }).click()

  // after the whistle a reload stays at the sheet check
  await expect(page.getByRole('heading', { name: 'Abpfiff! ✍️' })).toBeVisible()
  // the points open one after another; a tap on the locked photo button points to them
  const points = page.getByRole('group', { name: 'Kontrolle' }).getByRole('checkbox')
  await expect(points.nth(1)).toBeDisabled()
  const photo = (await page.getByRole('button', { name: '📷 Foto machen' }).boundingBox())!
  await page.mouse.click(photo.x + photo.width / 2, photo.y + photo.height / 2)
  await expect(page.getByRole('alert')).toContainText('Erst alles abhaken')
  await page.reload()
  await checkSheet(page)
  await uploadSkewedSheet(page)
  await acceptPhoto(page)
  await expect(page.getByLabel('Korrektur')).toBeVisible({ timeout: 20_000 })

  // Berichtigung: a reload keeps word and phase; a double tap moves one phase
  await page.getByRole('button', { name: '✏️ Berichtigung starten' }).click()
  await page.getByRole('button', { name: "▶ Los geht's" }).click()
  await expect(page.getByText('Wort 1 von 2')).toBeVisible()
  await page.getByRole('button', { name: '✋ Abdecken' }).click()
  await page.reload()
  await expect(page.getByText('Wort 1 von 2')).toBeVisible()
  await expect(page.getByText('✋ Abgedeckt')).toBeVisible()
  await page.getByRole('button', { name: '👀 Vergleichen' }).dblclick()
  await page.waitForTimeout(800)
  await expect(page.getByText('Wort 1 von 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Weiter →' })).toBeVisible()
})

test('[SR-15] Vokabeln: an English list from the start page; German is said, English written and graded', async ({ page }) => {
  await signUpAndStart(page)
  const plan = page.getByRole('tabpanel', { name: 'Trainingsplan' })
  const empty = plan.getByRole('article', { name: 'Vokabeln' })
  await expect(empty.getByRole('img', { name: 'Englisch' })).toBeVisible()
  await expect(empty).toContainText('Vokabeln')
  await expect(empty).toContainText('Noch keine Vokabelliste für Klasse 4.')
  await empty.getByRole('link', { name: '+ Neue Vokabelliste' }).click()

  // The editor opens for Vokabeln; the type is fixed once words are in (and free again when empty)
  await expect(page.getByRole('heading', { name: 'Neue Vokabelliste' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Englisch · Vokabeln' })).toHaveAttribute('aria-pressed', 'true')
  // A photo of the list: AI_FAKE reads two pairs; removed again, the list is typed
  await uploadSkewedSheet(page)
  await acceptPhoto(page)
  await expect(page.getByLabel('Englisch 1')).toHaveValue('dog', { timeout: 20_000 })
  await expect(page.getByLabel('Deutsch 1')).toHaveValue('der Hund')
  await page.getByRole('button', { name: 'dog entfernen' }).click()
  await page.getByRole('button', { name: 'cat entfernen' }).click()
  await page.getByText('Oder Wörter eintippen').click()
  await page.getByLabel(/Vokabeln, eine pro Zeile/).fill('die Wise = die Wiese\nred = rot')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await expect(page.getByText('2 Vokabeln')).toBeVisible()
  await expect(page.getByLabel('Deutsch 2')).toHaveValue('rot')
  await expect(page.getByRole('button', { name: 'Englisch · Vokabeln' })).toHaveCount(0)
  await page.getByLabel('Deutsch 2').fill('')
  await expect(page.getByText('Jede Vokabel braucht ihre deutsche Bedeutung.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Liste speichern' })).toBeDisabled()
  await page.getByLabel('Deutsch 2').fill('rot')
  await page.getByLabel('Name der Liste').fill('Unit 1')
  await page.getByRole('button', { name: 'Liste speichern' }).click()

  // Tagged on the list page; practised from the Trainingsplan like a dictation, with English hints
  await expect(page.getByRole('article').filter({ hasText: 'Unit 1' })).toContainText('Englisch · Vokabeln')
  await page.goto('/')
  const card = plan.getByRole('article', { name: 'Unit 1' })
  await expect(card.getByRole('img', { name: 'Englisch' })).toBeVisible()
  await expect(card).toContainText('Vokabeln')
  await plan.getByRole('button', { name: 'Filter' }).click() // folded away until opened
  await plan.getByRole('group', { name: 'Fach' }).getByRole('button', { name: 'Englisch' }).click()
  await expect(plan.getByRole('article')).toHaveCount(1)
  await card.getByRole('link', { name: 'Unit 1' }).click()
  await page.getByRole('button', { name: 'Training starten: Unit 1' }).click()
  await expect(page.getByText('Vokabeln · Unit 1 · Max')).toBeVisible()
  await expect(page.getByText('Du hörst das deutsche Wort.')).toBeVisible()
  await kickOff(page)
  await expect(page.getByText(/Schreib die 1 und das englische Wort\./)).toBeVisible()
  await page.getByRole('button', { name: 'Weiter →' }).click()
  await page.getByRole('button', { name: 'Abpfiff – Foto machen' }).click()
  await expect(page.getByText('Englische Wörter klein geschrieben? Groß nur „I“ und Namen.')).toBeVisible()
  await expect(page.getByText(/Nomen mit der, die oder das/)).toHaveCount(0)
  await checkSheet(page)
  await uploadSkewedSheet(page)
  await acceptPhoto(page)

  // AI_FAKE reads "die Wise" on every line: right for the first word
  const sheet = page.getByLabel('Korrektur')
  await expect(sheet.getByRole('heading', { name: /^Vokabeln · Max/ })).toBeVisible({ timeout: 20_000 })
  await expect(sheet.getByText('1/2')).toBeVisible()
})

test('[SR-06] trainers add a player photo: cut out and drawn on the device, shown on the card', async ({ page }) => {
  test.setTimeout(90_000)
  await signUpAndStart(page, 'Max')
  await enterTrainerArea(page)
  await page.getByRole('button', { name: 'Spielerkarte Max bearbeiten' }).click()
  const dialog = page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' })

  // a picture without a person is refused
  const empty = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 400
    c.height = 300
    const g = c.getContext('2d')!
    g.fillStyle = '#9ca3af'
    g.fillRect(0, 0, 400, 300)
    return c.toDataURL('image/jpeg').split(',')[1]
  })

  await dialog.getByLabel('Foto auswählen').setInputFiles({ name: 'wand.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(empty, 'base64') })
  await expect(dialog.getByRole('alert')).toContainText('niemand zu erkennen', { timeout: 30_000 })

  // a real photo becomes a drawing in the preview, then on the card
  await dialog.getByLabel('Foto auswählen').setInputFiles('e2e/fixtures/player.jpg')
  await expect(dialog.getByRole('img', { name: 'Gezeichnetes Foto' })).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Spieler anlegen' }).click()
  const second = page.getByRole('dialog', { name: 'Spieler anlegen' })
  await second.getByLabel('Name').fill('Lea')
  await second.getByRole('radio', { name: '2' }).check()
  await second.getByRole('button', { name: 'Spieler anlegen' }).click()
  await expect(second).toBeHidden()
  await page.getByRole('link', { name: 'Spielzug' }).click()
  const card = page.getByRole('article', { name: 'Spielerkarte Max' })
  await expect(card.locator('img')).toBeVisible()
  expect(await card.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  // the photo must not be dragged as an image: a swipe across it belongs to the card
  await expect(card.locator('img')).toHaveAttribute('draggable', 'false')
  expect(await card.locator('img').evaluate((img) => getComputedStyle(img).pointerEvents)).toBe('none')
  const box = (await card.locator('img').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByRole('article', { name: 'Spielerkarte Lea' })).toBeVisible()
  await page.getByRole('button', { name: 'Vorheriger Spieler' }).click()

  // the whole card opens the child's own edit dialog (a tap on the stats, not the picture); it offers no photo
  const own = page.getByRole('article', { name: /^Spielerkarte / })
  const ownBox = (await own.boundingBox())!
  await page.mouse.click(ownBox.x + ownBox.width / 2, ownBox.y + ownBox.height * 0.92)
  await expect(page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' }).getByLabel('Foto auswählen')).toHaveCount(0)
})

test('[SR-06][SR-50][SR-62] colour schemes preview their crests, save to the card as a dark or light kit and theme the app', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await signUpAndStart(page)
  await enterTrainerArea(page)
  await page.getByRole('button', { name: 'Spielerkarte Max bearbeiten' }).click()
  const dialog = page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' })
  const preview = dialog.locator('article')

  await expect(dialog).toHaveAttribute('data-presentation', 'stage')
  await expect(preview).toBeVisible()
  // the preview is the whole card; the form panel covers its stats, the name stays in view
  await expect(preview.locator('dt')).toHaveText(['Tore', 'Trefferquote', 'Serie', 'Schwerpunkt'])
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const panel = element.querySelector('form')!.getBoundingClientRect()
        const stats = element.querySelector('article dl')!.getBoundingClientRect()
        const name = element.querySelector('article h2')!.getBoundingClientRect()
        return panel.top <= stats.top && name.bottom <= panel.top
      }),
    )
    .toBe(true)
  // slid in from the bottom over a dimmed, blurred page; the card lands after it, turned into its tilt
  await expect.poll(() => dialog.evaluate((element) => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight))).toBeLessThan(2)
  await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
  await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element, '::backdrop').backdropFilter)).toBe('blur(4px)')
  const tilt = () => dialog.evaluate((element) => Math.asin(new DOMMatrixReadOnly(getComputedStyle(element.querySelector('.player-editor-preview > div')!).transform).m12) * (180 / Math.PI))
  await expect.poll(async () => Math.abs((await tilt()) - 1.5)).toBeLessThan(0.1)
  const modalScreenshot = testInfo.outputPath('player-editor-bottom-sheet.png')
  await page.screenshot({ path: modalScreenshot })
  await testInfo.attach('player-editor-bottom-sheet', { path: modalScreenshot, contentType: 'image/png' })

  // the card goes back behind the panel, the sheet slides out with its content (the gallery already cleared it), then it closes
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect
    .poll(() => dialog.evaluate((element) => (element as HTMLDialogElement).open && new DOMMatrixReadOnly(getComputedStyle(element.querySelector('.player-editor-panel')!).transform).m42 > 0))
    .toBe(true)
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Spielerkarte Max bearbeiten' }).click()
  // every club, whatever its rarity (SR-63)
  await dialog.getByRole('radio', { name: 'Bundesliga', exact: true }).check()

  // one dark and one light kit; the unit tests check every scheme's contrast
  const sample = PLAYER_SCHEMES.filter((s) => s.id === 'rot-weiss-blau' || s.id === 'schwarz-gelb')
  for (const [index, scheme] of sample.entries()) {
    if (index > 0) await page.getByRole('button', { name: 'Karte bearbeiten', exact: true }).click()
    if (index === 1) {
      await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
      expect(await dialog.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)).toBe(0)
    }
    // plain pointer events: the mouse drag works in the phone emulation too
    if (index === 0) {
      // the club row is dragged sideways, with the mouse too; a drag never picks a club (once the sheet is up)
      await expect.poll(() => dialog.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element.querySelector('.player-editor-panel')!).transform).m42)).toBe(0)
      const clubs = dialog.getByRole('group', { name: 'Verein' })
      // a club from the middle first (keyboard focus brings it into the middle), then drag towards the end
      await chooseClub(dialog, 'Himmelblau')
      const last = clubs.getByRole('radio').last()
      await page.waitForTimeout(400)
      const before = (await last.boundingBox())!.x
      const row = (await clubs.boundingBox())!
      await page.mouse.move(row.x + row.width * 0.8, row.y + row.height / 2)
      await page.mouse.down()
      await page.mouse.move(row.x + row.width * 0.2, row.y + row.height / 2, { steps: 8 })
      await page.mouse.up()
      await expect.poll(async () => (await last.boundingBox())!.x).toBeLessThan(before)
      await expect(clubs.getByRole('radio', { name: 'Himmelblau' })).toBeChecked()
    }
    await chooseClub(dialog, scheme.label)
    await expect(preview).toContainText(scheme.label)
    expect(await preview.evaluate((card) => getComputedStyle(card).getPropertyValue('--player').trim())).toBe(scheme.action)

    if (index === 0) await expect(dialog.locator('label:has(input[name=color]) svg[viewBox="-5 -3 110 126"]')).toHaveCount(PLAYER_SCHEMES.length)
    await dialog.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog).toBeHidden()
    if (index === 0) await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('link', { name: 'Spielzug' }).click()

    const card = page.getByRole('article', { name: 'Spielerkarte Max' })
    await expect(card).toContainText(scheme.label)
    const picture = card.getByTestId('card-picture')
    expect(await picture.evaluate((el) => getComputedStyle(el).color)).toBe(scheme.text === '#ffffff' ? 'rgb(255, 255, 255)' : 'rgb(17, 17, 17)')
    expect(await page.locator('main').evaluate((main) => getComputedStyle(main.parentElement!).getPropertyValue('--player').trim())).toBe(scheme.action)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const screenshot = testInfo.outputPath(`${scheme.id}-player-card.png`)
    await page.screenshot({ path: screenshot })
    await testInfo.attach(`${scheme.id}-player-card`, { path: screenshot, contentType: 'image/png' })
  }
})

/** Graded rounds for the player, written with the app's own client (as the signed-in trainer, under RLS). */
async function seedGames(page: Page, player: string, days: readonly number[]): Promise<void> {
  await page.evaluate(
    async ({ player, days }: { player: string; days: readonly number[] }) => {
      // served by Vite in the browser; the type comes from the source
      const url = '/src/lib/supabase.ts'
      const { supabase } = (await import(/* @vite-ignore */ url)) as { supabase: SupabaseClient<Database> }
      const child = (await supabase.from('children').select('id, family_id').eq('name', player).single()).data!
      const words = ['a', 'b', 'c'].map((id) => ({ id, article: null, word: `Wort ${id}`, form: null, sentence: null }))
      const list = (await supabase.from('word_lists').insert({ family_id: child.family_id, title: 'Liga-Liste', words }).select('id').single()).data!
      for (const day of days) {
        const at = new Date(Date.now() - day * 86_400_000).toISOString()
        const results = words.map((w) => ({ wordId: w.id, read: w.word, confidence: 1, verdict: 'right', errors: [] }))
        const { error } = await supabase
          .from('dictation_rounds')
          .insert({ family_id: child.family_id, child_id: child.id, list_id: list.id, word_ids: words.map((w) => w.id), results, created_at: at, checked_at: at })
        if (error) throw error
      }
    },
    { player, days },
  )
}

test('[SR-63] a player starts in the Kreisliga, is promoted by their games and trainers can set the league', async ({ page }, testInfo) => {
  await signUpAndStart(page, 'Mila')
  // Trainingsplan and Liga are tabs; the open one stays in the URL
  await page.getByRole('tab', { name: 'Liga' }).click()
  await expect(page).toHaveURL(/\?tab=liga$/)
  const league = page.getByRole('region', { name: /Kreisliga/ })
  await expect(league).toContainText('Für den Aufstieg in die Bezirksliga')
  await expect(league).toContainText('3 Spiele')
  await expect(league).toContainText('0/3')

  // the player's own editor: clubs above one star are locked and say from which league
  await page.getByRole('button', { name: 'Karte bearbeiten', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' })
  await expect(dialog.getByRole('radio', { name: 'Rot-Schwarz', exact: true })).toBeEnabled()
  await expect(dialog.getByRole('radio', { name: 'Grün-Weiß, ab der Bezirksliga' })).toBeDisabled()
  await expect(dialog.getByRole('radio', { name: 'Weiß-Gold, ab der Bundesliga' })).toBeDisabled()
  await expect(dialog).toContainText('Mehr Vereine gibt es mit dem Aufstieg in die Bezirksliga.')
  await expect(dialog.getByRole('group', { name: 'Liga' })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(dialog).toBeHidden()

  // three games on two days: promoted once, with the clubs it opens
  await seedGames(page, 'Mila', [1, 0, 0])
  await page.reload()
  const promotion = page.getByRole('dialog', { name: 'Aufstieg' })
  await expect(promotion).toContainText('Mila spielt jetzt in der Bezirksliga. 3 neue Vereine sind frei:')
  await expect(promotion).toContainText('Grün-Weiß')
  const screenshot = testInfo.outputPath('promotion.png')
  await page.screenshot({ path: screenshot })
  await testInfo.attach('promotion', { path: screenshot, contentType: 'image/png' })
  await promotion.getByRole('button', { name: 'Super!' }).click()
  await expect(promotion).toBeHidden()
  await expect(page.getByRole('region', { name: /Bezirksliga/ })).toContainText('Für den Aufstieg in die Landesliga')
  await expect(page.getByRole('region', { name: /Bezirksliga/ })).toContainText('1 Berichtigung geschafft')
  const panel = testInfo.outputPath('league-panel.png')
  await page.screenshot({ path: panel, fullPage: true })
  await testInfo.attach('league-panel', { path: panel, contentType: 'image/png' })
  await page.reload()
  await expect(page.getByRole('region', { name: /Bezirksliga/ })).toBeVisible()
  await expect(promotion).toBeHidden()

  await page.getByRole('button', { name: 'Karte bearbeiten', exact: true }).click()
  await chooseClub(dialog, 'Grün-Weiß')
  const editor = testInfo.outputPath('locked-clubs.png')
  await page.screenshot({ path: editor })
  await testInfo.attach('locked-clubs', { path: editor, contentType: 'image/png' })
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('article', { name: 'Spielerkarte Mila' })).toContainText('Grün-Weiß')

  // trainers set the league, but not below what the games earned
  await enterTrainerArea(page)
  await page.getByRole('button', { name: 'Spielerkarte Mila bearbeiten' }).click()
  await expect(dialog.getByRole('radio', { name: 'Kreisliga', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('radio', { name: 'Bezirksliga', exact: true })).toBeChecked()
  await expect(dialog).toContainText('Erspielt: Bezirksliga. Tiefer geht es nicht.')
  await dialog.getByRole('radio', { name: 'Landesliga', exact: true }).check()
  await chooseClub(dialog, 'Himmelblau')
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('link', { name: 'Spielzug' }).click()
  await page.getByRole('tab', { name: 'Liga' }).click()
  await expect(page.getByRole('region', { name: /Landesliga/ })).toContainText('Für den Aufstieg in die Oberliga')
  await expect(page.getByRole('article', { name: 'Spielerkarte Mila' })).toContainText('Himmelblau')
  await expect(promotion).toBeHidden()
})

test('[SR-09] trainers delete a player; the admin deletes the team with everything and the account', async ({ page }) => {
  const email = await signUpAndStart(page, 'Max')
  await enterTrainerArea(page)
  await page.getByRole('button', { name: 'Spieler anlegen' }).click()
  const created = page.getByRole('dialog', { name: 'Spieler anlegen' })
  await created.getByLabel('Name').fill('Lea')
  await created.getByRole('radio', { name: '2' }).check()
  await created.getByRole('button', { name: 'Spieler anlegen' }).click()
  await expect(created).toBeHidden()

  // a player goes after a confirmation; Abbrechen keeps them
  await page.getByRole('button', { name: 'Spielerkarte Lea bearbeiten' }).click()
  await page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' }).getByRole('button', { name: 'Spieler löschen' }).click()
  const confirm = page.getByRole('dialog', { name: 'Spieler löschen' })
  await expect(confirm).toContainText('Die Wörterlisten bleiben.')
  await confirm.getByRole('button', { name: 'Spieler löschen' }).click()
  await expect(page.getByRole('button', { name: 'Spielerkarte Lea bearbeiten' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Spielerkarte Max bearbeiten' })).toBeVisible()

  // the team only with its name typed in; then the account is gone too
  await page.getByRole('button', { name: 'Konto', exact: true }).click()
  const deleteTeam = page.getByRole('button', { name: 'Team endgültig löschen' })
  await expect(deleteTeam).toBeDisabled()
  await page.getByLabel(/den Teamnamen/).fill('Familie')
  await deleteTeam.click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByLabel('Passwort').fill(PASSWORD)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByText('E-Mail oder Passwort stimmt nicht.')).toBeVisible()
})

test('[SR-10] a photographed word list is read and can be checked before saving', async ({ page }) => {
  await signUpAndStart(page)
  await page.getByRole('link', { name: '+ Neue Wörterliste' }).click()
  await uploadSkewedSheet(page)
  await acceptPhoto(page)
  // AI_FAKE returns two words with sentences and a title
  await expect(page.getByText('2 Wörter')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByLabel('Wort 2')).toHaveValue('Wiese')
  await expect(page.getByLabel('Satz 1')).toHaveValue('Der Hund bellt laut.')
  await expect(page.getByLabel('Name der Liste')).toHaveValue('Lernwörter (Test)')
  await page.getByRole('button', { name: 'Liste speichern' }).click()
  await expect(page.getByText('0 von 2 Wörtern sicher')).toBeVisible()
})

test('[SR-07][SR-11] typed words are saved without "Hinzufügen"; the editor returns to the trainer\'s Wörterlisten', async ({ page }) => {
  await signUpAndStart(page)
  await enterTrainerArea(page)
  await page.getByRole('button', { name: 'Wörterlisten', exact: true }).click()
  await expect(page).toHaveURL(/section=lists/)
  await page.getByRole('link', { name: '+ Neue Liste' }).click()
  await page.getByText('Oder Wörter eintippen').click()
  await page.getByLabel('Wörter, eins pro Zeile').fill('der Hund\nelf\nrot')
  await page.getByLabel('Name der Liste').fill('Lernwörter C')
  await page.getByRole('button', { name: 'Liste speichern' }).click()

  await expect(page.getByRole('button', { name: 'Wörterlisten', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const card = page.getByRole('article').filter({ hasText: 'Lernwörter C' })
  await expect(card).toContainText('0 von 3 Wörtern sicher')
  // and back from the editor without saving
  await card.getByRole('link', { name: 'Liste ansehen' }).click()
  await page.getByRole('link', { name: 'Zurück' }).click()
  await expect(page.getByRole('button', { name: 'Wörterlisten', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('[SR-12] progress is reset to zero after confirming; the list stays', async ({ page }) => {
  await signUpAndStart(page)
  await page.getByRole('link', { name: '+ Neue Wörterliste' }).click()
  await page.getByText('Oder Wörter eintippen').click()
  await page.getByLabel('Wörter, eins pro Zeile').fill('der Hund\nelf\ndie Wiese')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await page.getByLabel('Name der Liste').fill('Lernwörter A')
  await page.getByRole('button', { name: 'Liste speichern' }).click()
  await expect(page.getByRole('button', { name: 'Fortschritt zurücksetzen' })).toHaveCount(0)

  // One round played (started), back to the overview
  await page.getByRole('button', { name: '▶ Diktat starten' }).click()
  await expect(page.getByRole('heading', { name: 'Trainings-Vorbereitung' })).toBeVisible()
  await page.goto('/dictation')

  // Cancel keeps everything, confirm resets
  const reset = page.getByRole('button', { name: 'Fortschritt zurücksetzen' })
  const dialog = page.getByRole('dialog', { name: 'Zurücksetzen' })
  await reset.click()
  await expect(dialog).toContainText('Die Wörter bleiben.')
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(dialog).toBeHidden()
  await expect(reset).toBeVisible()
  // A click inside keeps the dialog open; a click on the backdrop closes it like Abbrechen
  await reset.click()
  await dialog.getByText('Die Wörter bleiben.').click()
  await expect(dialog).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(dialog).toBeHidden()
  await expect(reset).toBeVisible()
  await reset.click()
  await dialog.getByRole('button', { name: 'Zurücksetzen' }).click()
  await expect(reset).toHaveCount(0)
  await expect(page.getByText('0 von 3 Wörtern sicher')).toBeVisible()
})

test('[SR-04][SR-13][SR-20][SR-53] each child has its own progress on a shared list; the card switches players', async ({ page }) => {
  await signUpAndStart(page, 'Max')
  await page.getByRole('link', { name: '+ Neue Wörterliste' }).click()
  await page.getByText('Oder Wörter eintippen').click()
  await page.getByLabel('Wörter, eins pro Zeile').fill('der Hund\nelf')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await page.getByLabel('Name der Liste').fill('Lernwörter A')
  await page.getByRole('button', { name: 'Liste speichern' }).click()

  // Max practises
  await page.getByRole('button', { name: '▶ Diktat starten' }).click()
  await expect(page.getByText('Wort-Diktat · Lernwörter A · Max')).toBeVisible()
  const maxRound = page.url()
  await page.goto('/dictation')
  await expect(page.getByRole('button', { name: 'Fortschritt zurücksetzen' })).toBeVisible()

  // A second player, created in the trainer area, starts from zero on the same list
  await enterTrainerArea(page)
  await page.getByRole('button', { name: 'Spieler anlegen' }).click()
  const dialog = page.getByRole('dialog', { name: 'Spieler anlegen' })
  await dialog.getByLabel('Name').fill('Lea')
  await expect(dialog.getByRole('button', { name: 'Spieler anlegen' })).toBeDisabled() // Klasse is required
  await dialog.getByRole('radio', { name: '2' }).check()
  await dialog.getByRole('button', { name: 'Spieler anlegen' }).click()
  await expect(dialog).toBeHidden()
  await page.goto('/dictation')
  await page.getByRole('button', { name: 'Lea', pressed: false }).click()
  await expect(page.getByText('Lea: 0 von 2 Wörtern sicher')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fortschritt zurücksetzen' })).toHaveCount(0)

  // Back to Max: his round is still there
  await page.getByRole('button', { name: 'Max', pressed: false }).click()
  await expect(page.getByRole('button', { name: 'Fortschritt zurücksetzen' })).toBeVisible()

  // The start page shows the chosen player; starting again reopens Max's unfinished round
  await page.getByRole('link', { name: 'Spielzug' }).click()
  await expect(page.getByRole('article', { name: 'Spielerkarte Max' })).toBeVisible()
  await page.getByRole('link', { name: 'Lernwörter A' }).click()
  await expect(page.getByRole('link', { name: /^Angefangenes Spiel/ })).toBeVisible()
  await page.getByRole('button', { name: 'Training starten: Lernwörter A' }).click()
  await expect(page.getByRole('heading', { name: 'Trainings-Vorbereitung' })).toBeVisible()
  expect(page.url()).toBe(maxRound)
  await page.getByRole('link', { name: '← Spielvorbereitung' }).click()
  await page.getByRole('link', { name: '← Trainingsplan' }).click()
  // a double tap moves one card (with two players a second step would land back on Max)
  await page.getByRole('button', { name: 'Nächster Spieler' }).dblclick()
  await expect(page.getByRole('article', { name: 'Spielerkarte Lea' })).toBeVisible()
  await page.waitForTimeout(800)
  await expect(page.getByRole('article', { name: 'Spielerkarte Lea' })).toBeVisible()
  // Lea is in Klasse 2: the list for Klasse 4 and the Englisch subject are not hers
  await expect(page.getByText('Noch keine Wörterliste für Klasse 2.')).toBeVisible()
  await page.getByRole('button', { name: 'Filter' }).click()
  const subjects = page.getByRole('group', { name: 'Fach' })
  await expect(subjects.getByRole('button', { name: 'Englisch' })).toHaveCount(0)
  await expect(subjects.getByRole('button', { name: 'Mathematik' })).toBeVisible()

  // A swipe across the avatar switches the player and does not open the card's edit modal
  const avatar = page.getByRole('button', { name: 'Karte bearbeiten', exact: true })
  const box = (await avatar.boundingBox())!
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByRole('article', { name: 'Spielerkarte Max' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' })).toBeHidden()
})

test('[SR-13][SR-14] lists are meant for a Klasse range; the start page shows one card per matching list, filtered by status', async ({ page }) => {
  await signUpAndStart(page, 'Max') // Klasse 4
  async function newList(title: string, tap: (number | 'Mehrere Klassen')[] = []) {
    await page.goto('/dictation/lists/new')
    await page.getByText('Oder Wörter eintippen').click()
    // AI_FAKE reads "die Wise" on every line: one of the two words becomes secure
    await page.getByLabel('Wörter, eins pro Zeile').fill('die Wise\nelf')
    await page.getByRole('button', { name: 'Hinzufügen' }).click()
    await page.getByLabel('Name der Liste').fill(title)
    for (const g of tap) {
      if (g === 'Mehrere Klassen') await page.getByLabel(g).check()
      else await page.getByRole('button', { name: `Klasse ${g}`, exact: true }).click()
    }
    await page.getByRole('button', { name: 'Liste speichern' }).click()
    await expect(page).toHaveURL(/\/dictation$/)
  }
  await page.goto('/dictation/lists/new')
  await expect(page.getByText('Für Klasse 4')).toBeVisible() // the player's Klasse by default
  await newList('Lernwörter A')
  await newList('Lernwörter B')
  // a tap picks one Klasse: 4 → 3; a range needs "Mehrere Klassen"
  await page.goto('/dictation/lists/new')
  await page.getByRole('button', { name: 'Klasse 3', exact: true }).click()
  await expect(page.getByText('Für Klasse 3')).toBeVisible()
  await newList('Erste Wörter', [1, 'Mehrere Klassen', 2]) // 1 → just 1, then 2 spans 1–2

  // The list page tags each list and filters by Klasse
  await expect(page.getByText('Klasse 1–2')).toBeVisible()
  await page.getByRole('button', { name: 'Klasse 2', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Erste Wörter' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lernwörter A' })).toHaveCount(0)

  // Max plays a round on A; B stays new; "Erste Wörter" is not for Klasse 4
  await page.goto('/')
  const plan = page.getByRole('tabpanel', { name: 'Trainingsplan' })
  const lists = plan.getByRole('article').filter({ hasText: 'Wort-Diktat' })
  await expect(lists).toHaveCount(2)
  await expect(lists.first()).toHaveAccessibleName('Lernwörter B') // no test dates: newest first
  await expect(plan.getByRole('article', { name: 'Einmaleins' })).toContainText('kommt später')
  await expect(page.getByRole('heading', { name: 'Erste Wörter' })).toHaveCount(0)
  await expect(lists.getByText('In Arbeit')).toHaveCount(0) // nothing secure yet: no "In Arbeit"
  await plan.getByRole('link', { name: 'Lernwörter A' }).click()
  await page.getByRole('button', { name: 'Training starten: Lernwörter A' }).click()
  await kickOff(page)
  await page.getByRole('button', { name: 'Weiter →' }).click()
  await page.getByRole('button', { name: 'Abpfiff – Foto machen' }).click()
  await checkSheet(page)
  await uploadSkewedSheet(page)
  await acceptPhoto(page)
  await expect(page.getByLabel('Korrektur')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('link', { name: 'Spielvorbereitung', exact: true }).click()
  await page.getByRole('link', { name: '← Trainingsplan' }).click()
  await expect(plan.getByRole('article', { name: 'Lernwörter A' }).getByText('In Arbeit')).toBeVisible()

  // Filters: subject and status, folded away until opened; the toggle names the active ones
  await expect(plan.getByRole('group', { name: 'Status' })).toBeHidden()
  await plan.getByRole('button', { name: 'Filter' }).click()
  const status = plan.getByRole('group', { name: 'Status' })
  await status.getByRole('button', { name: 'Neu' }).click()
  await expect(plan.getByRole('article')).toHaveCount(1)
  await expect(plan.getByRole('article')).toHaveAccessibleName('Lernwörter B')
  await expect(plan.getByRole('button', { name: 'Filter · Neu' })).toHaveAttribute('aria-expanded', 'true')
  await status.getByRole('button', { name: 'Abgeschlossen' }).click()
  await expect(plan.getByText('Nichts für diesen Filter.')).toBeVisible()
  await status.getByRole('button', { name: 'Alle' }).click()
  await plan.getByRole('group', { name: 'Fach' }).getByRole('button', { name: 'Mathematik' }).click()
  await expect(plan.getByRole('article')).toHaveCount(2) // Einmaleins, Dividieren
  await expect(lists).toHaveCount(0)
})

test('[SR-06][SR-53] a player edits their own card from the start page, but not the grade', async ({ page }) => {
  await signUpAndStart(page, 'Max')
  const pageCard = page.getByRole('article', { name: 'Spielerkarte Max' })
  await page.getByRole('button', { name: 'Karte bearbeiten', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' })
  // the card is picked up from the page: the page's card hides, the modal's lands fully in view above the form
  await expect(pageCard).toBeHidden()
  await expect
    .poll(() =>
      dialog.locator('article').evaluate((card) => {
        const box = card.getBoundingClientRect()
        return box.top >= 0 && box.bottom <= window.innerHeight
      }),
    )
    .toBe(true)
  await expect(dialog.getByRole('radio', { name: '4' })).toHaveCount(0)

  // swiping the card changes the club in step with the row; a new player starts with the first club (one star), where it stops
  const swipe = async (direction: 1 | -1) => {
    // wait until the card has landed (flight into the modal, club change): a press beside a moving
    // card hits the stage, and the stage closes the editor
    const boxOf = async () => JSON.stringify(await dialog.locator('article').boundingBox())
    await expect
      .poll(async () => {
        const before = await boxOf()
        await page.waitForTimeout(100)
        return before === (await boxOf())
      })
      .toBe(true)
    const card = (await dialog.locator('article').boundingBox())!
    const [from, to] = direction === 1 ? [0.8, 0.1] : [0.1, 0.8]
    await page.mouse.move(card.x + card.width * from, card.y + card.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(card.x + card.width * to, card.y + card.height * 0.3, { steps: 6 })
    await page.mouse.up()
  }
  await expect(dialog.getByRole('radio', { name: 'Schwarz-Weiß', exact: true })).toBeChecked()
  await swipe(-1)
  await expect(dialog.getByRole('radio', { name: 'Schwarz-Weiß', exact: true })).toBeChecked()
  await swipe(1)
  await expect(dialog.getByRole('radio', { name: 'Rot-Schwarz', exact: true })).toBeChecked()
  await expect(dialog.locator('article')).toContainText('Rot-Schwarz')
  await swipe(-1)
  await expect(dialog.getByRole('radio', { name: 'Schwarz-Weiß', exact: true })).toBeChecked()
  await expect(dialog).toBeVisible() // a swipe never closes the editor
  // with a mouse, the row's arrows choose the next/previous club (they are hidden on touch screens)
  const arrows = dialog.getByRole('group', { name: 'Verein' }).locator('button[aria-hidden]')
  if (await arrows.last().isVisible()) {
    await arrows.last().click()
    await expect(dialog.getByRole('radio', { name: 'Rot-Schwarz', exact: true })).toBeChecked()
    await arrows.first().click()
    await expect(dialog.getByRole('radio', { name: 'Schwarz-Weiß', exact: true })).toBeChecked()
  }

  // the number rolls: swiping up counts up (one digit per step), typing sets a digit
  const ones = dialog.getByRole('spinbutton', { name: 'Einer' })
  await expect(ones).toHaveAttribute('aria-valuetext', 'keine')
  await ones.evaluate((roll) => roll.scrollIntoView({ block: 'center' })) // not under the sticky footer
  const roll = (await ones.boundingBox())!
  await page.mouse.move(roll.x + roll.width / 2, roll.y + roll.height - 4)
  await page.mouse.down()
  await page.mouse.move(roll.x + roll.width / 2, roll.y + roll.height - 4 - 60, { steps: 6 })
  await page.mouse.up()
  await expect(ones).toHaveAttribute('aria-valuenow', '2')
  await setShirtNumber(dialog, 9)
  await dialog.getByRole('radio', { name: 'Tor', exact: true }).check()
  await expect(dialog.locator('article')).toContainText('Tor · Klasse 4')
  await chooseClub(dialog, 'Rot-Schwarz')
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(pageCard).toBeVisible()
  await expect(page.getByRole('article', { name: 'Spielerkarte Max' }).getByText('Mittelfeld · Klasse 4')).toBeVisible()

  await page.getByRole('button', { name: 'Karte bearbeiten', exact: true }).click()
  await dialog.getByRole('radio', { name: 'Tor', exact: true }).check()
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('article', { name: 'Spielerkarte Max' }).getByText('Tor · Klasse 4')).toBeVisible()

  // the sheet scrolls from anywhere, also above the form; iOS does not scroll a scroller with pointer-events: none
  await page.getByRole('button', { name: 'Karte bearbeiten', exact: true }).click()
  const sheet = dialog.locator('.player-editor-sheet')
  await expect.poll(() => dialog.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element.querySelector('.player-editor-panel')!).transform).m42)).toBe(0)
  expect(await sheet.evaluate((element) => getComputedStyle(element).pointerEvents)).not.toBe('none')
  await page.mouse.move(8, 8)
  await page.mouse.wheel(0, 300)
  await expect.poll(() => sheet.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  // a tap on no content (beside the card, above the form) closes it
  await sheet.evaluate((element) => element.scrollTo({ top: 0 }))
  await page.mouse.click(8, 8)
  await expect(dialog).toBeHidden()
})

test('[SR-05][SR-06][SR-07][SR-08] trainer gate protects team name, profile management, invitations and team PIN settings', async ({ page, browser }) => {
  const ownerEmail = await signUpAndStart(page, 'Max')
  await enterTrainerArea(page)

  // The player's card opens the edit modal; trainers also set the grade
  await page.getByRole('button', { name: 'Spielerkarte Max bearbeiten' }).click()
  const playerDialog = page.getByRole('dialog', { name: 'Spielerkarte bearbeiten' })
  await setShirtNumber(playerDialog, 10)
  await playerDialog.getByRole('radio', { name: 'Sturm', exact: true }).check()
  await playerDialog.getByRole('radio', { name: '3' }).check()
  await playerDialog.getByRole('radio', { name: 'Landesliga', exact: true }).check()
  await chooseClub(playerDialog, 'Rot-Weiß-Blau')
  await playerDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(playerDialog).toBeHidden()
  await page.reload()
  await page.getByRole('button', { name: 'Spielerkarte Max bearbeiten' }).click()
  await expect(playerDialog.getByRole('spinbutton', { name: 'Zehner' })).toHaveAttribute('aria-valuenow', '1')
  await expect(playerDialog.getByRole('spinbutton', { name: 'Einer' })).toHaveAttribute('aria-valuenow', '0')
  await expect(playerDialog.getByRole('radio', { name: 'Sturm', exact: true })).toBeChecked()
  await expect(playerDialog.getByRole('radio', { name: '3' })).toBeChecked()
  await expect(playerDialog.getByRole('radio', { name: 'Rot-Weiß-Blau' })).toBeChecked()
  await playerDialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(playerDialog).toBeHidden()

  await expect(page.getByLabel('Teamname')).toHaveValue('Familie')
  await page.getByLabel('Teamname').fill('FC Diktat')
  await page.getByRole('button', { name: 'Teamname speichern' }).click()
  await expect(page.getByRole('button', { name: 'Teamname speichern' })).toBeDisabled()

  const inviteEmail = uniqueEmail('trainer')
  await page.getByLabel('E-Mail-Adresse').fill(inviteEmail)
  await page.getByRole('button', { name: 'Einladungslink erstellen' }).click()
  await expect(page.getByLabel('Einladungslink')).toHaveValue(/\/trainer\/join\?token=/)
  const inviteUrl = await page.getByLabel('Einladungslink').inputValue()

  await page.getByRole('button', { name: 'Wörterlisten', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Lernwörter-Diktat' })).toBeVisible()
  await page.getByRole('button', { name: 'Team', exact: true }).click()

  await page.getByRole('button', { name: 'Konto', exact: true }).click()
  await expect(page.getByText('Lege einen neuen vierstelligen PIN fest.')).toBeVisible()
  await expect(page.getByTestId('app-version')).toHaveText(/^Version \d+\.\d+\.\d+ · \S+ · \d{1,2}\.\d{1,2}\.\d{4}$/)
  await page.getByLabel('Neuer Team-PIN').fill('5678')
  await page.getByRole('button', { name: 'PIN speichern' }).click()
  await expect(page.getByRole('status')).toContainText('Team-PIN gespeichert')
  await page.getByRole('link', { name: 'Trainer', exact: true }).click()
  await expect(page.getByText('Gib den vierstelligen Team-PIN ein.')).toBeVisible()
  await page.getByLabel('Team-PIN').fill('1234')
  await expect(page.getByLabel('Team-PIN')).toHaveValue('1234')
  await expect(page.getByRole('button', { name: 'Weiter' })).toBeEnabled()
  await page.getByRole('button', { name: 'Weiter' }).click()
  // a wrong PIN says how many tries are left and empties the field
  await expect(page.getByRole('alert')).toContainText('Der PIN stimmt nicht. Noch 4 Versuche.')
  await expect(page.getByLabel('Team-PIN')).toHaveValue('')
  // The on-screen keypad edits the same field and sends the PIN with its fourth digit
  const keypad = page.getByRole('group', { name: 'Ziffernblock' })
  for (const d of ['5', '6', '7']) await keypad.getByRole('button', { name: d, exact: true }).click()
  await keypad.getByRole('button', { name: 'Letzte Ziffer löschen' }).click()
  await expect(page.getByLabel('Team-PIN')).toHaveValue('56')
  await keypad.getByRole('button', { name: '7', exact: true }).click()
  await keypad.getByRole('button', { name: '8', exact: true }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Spieler', exact: true })).toBeVisible()

  const inviteePage = await browser.newPage()
  await inviteePage.goto(inviteUrl)
  await inviteePage.getByRole('link', { name: 'Konto erstellen' }).click()
  await inviteePage.getByRole('button', { name: 'Noch kein Konto? Konto erstellen' }).click()
  await inviteePage.getByLabel('E-Mail-Adresse').fill(inviteEmail)
  await inviteePage.getByLabel('Passwort').fill(PASSWORD)
  await inviteePage.getByRole('button', { name: 'Konto erstellen' }).click()
  await inviteePage.getByLabel('Code aus der E-Mail').fill(await readLoginCode(inviteEmail))
  await inviteePage.getByRole('button', { name: 'Bestätigen' }).click()
  await expect(inviteePage.getByRole('article', { name: 'Spielerkarte Max' })).toBeVisible()
  await inviteePage.getByRole('link', { name: 'Trainer', exact: true }).click()
  await inviteePage.getByLabel('Team-PIN').fill('5678')
  await inviteePage.getByRole('button', { name: 'Weiter' }).click()
  await expect(inviteePage.getByText('Nur der Team-Admin kann Trainer einladen.')).toBeVisible()
  await inviteePage.close()

  await page.getByRole('button', { name: 'Konto', exact: true }).click()
  await page.getByRole('button', { name: 'Abmelden' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('E-Mail-Adresse').fill(ownerEmail)
  await page.getByLabel('Passwort').fill(PASSWORD)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  const card = page.getByRole('article', { name: 'Spielerkarte Max' })
  await expect(card).toContainText('FC Diktat')
  await expect(card.getByText('Sturm · Klasse 3')).toBeVisible()
  await page.getByRole('link', { name: 'Trainer', exact: true }).click()
  await expect(page.getByLabel('Team-PIN')).toBeVisible()
})
