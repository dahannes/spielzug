import { expect, type Locator, type Page } from '@playwright/test'
import { readLoginCode, uniqueEmail } from './mailpit.ts'

export const PASSWORD = 'geheim-1234'

/** Creates a parent account with email + password and confirms it with the emailed code. */
export async function signUp(page: Page, email = uniqueEmail('parent')): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Noch kein Konto? Konto erstellen' }).click()
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByLabel('Passwort').fill(PASSWORD)
  await page.getByRole('button', { name: 'Konto erstellen' }).click()
  await page.getByLabel('Code aus der E-Mail').fill(await readLoginCode(email))
  await page.getByRole('button', { name: 'Bestätigen' }).click()
  return email
}

/** Signs up a new parent and adds the first player; the family is created automatically. */
export async function signUpAndStart(page: Page, child = 'Max'): Promise<string> {
  const email = await signUp(page)
  await expect(page.getByRole('heading', { name: 'Wer spielt?' })).toBeVisible()
  await page.getByLabel('Name').fill(child)
  await page.getByRole('radio', { name: '4' }).check()
  await page.getByRole('button', { name: 'Spieler anlegen' }).click()
  await expect(page.getByRole('article', { name: `Spielerkarte ${child}` })).toBeVisible()
  return email
}

/** Opens the trainer area, setting the team PIN on first entry. */
export async function enterTrainerArea(page: Page, pin = '1234'): Promise<void> {
  await page.getByRole('link', { name: 'Trainer', exact: true }).click()
  await page.getByLabel(/Team-PIN/).fill(pin)
  await page.getByRole('button', { name: /^(PIN festlegen|Weiter)$/ }).click()
  await expect(page.getByRole('heading', { name: 'Spieler', exact: true })).toBeVisible()
}

/** From the round's preparation screen: tick the checklist and kick off. */
export async function kickOff(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Trainings-Vorbereitung' })).toBeVisible()
  const kickoff = page.getByRole('button', { name: '▶ Anpfiff!' })
  await expect(kickoff).toBeDisabled()
  for (const box of await page.getByRole('checkbox').all()) await box.check()
  await kickoff.click()
}

/** After the whistle: the photo stays locked until every point of the sheet check is ticked. */
export async function checkSheet(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Abpfiff! ✍️' })).toBeVisible()
  const photo = page.getByRole('button', { name: '📷 Foto machen' })
  await expect(photo).toBeDisabled()
  for (const box of await page.getByRole('group', { name: 'Kontrolle' }).getByRole('checkbox').all()) await box.check()
  await expect(photo).toBeEnabled()
}

/** A skewed portrait sheet on a dark table, as a tablet photo would show it. */
export async function uploadSkewedSheet(page: Page): Promise<void> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 3000
    canvas.height = 2000
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#3b2f2a'
    ctx.fillRect(0, 0, 3000, 2000)
    ctx.fillStyle = '#f4f1ea'
    ctx.beginPath()
    ctx.moveTo(1050, 150)
    ctx.lineTo(2050, 250)
    ctx.lineTo(1950, 1850)
    ctx.lineTo(950, 1750)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#333'
    ctx.font = '90px sans-serif'
    ctx.fillText('A1  345 + 678', 1150, 500)
    ctx.fillText('B2  12 + 9', 1100, 1600)
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
  })
  await page.locator('input[type=file]').first().setInputFiles({ name: 'bogen.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') })
}

/** Photo of a part of a page: tilted handwriting-like lines on white paper, no page edges. */
export async function uploadTiltedLines(page: Page): Promise<void> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2000
    canvas.height = 1500
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f2efe8'
    ctx.fillRect(0, 0, 2000, 1500)
    ctx.translate(1000, 750)
    ctx.rotate((6 * Math.PI) / 180)
    ctx.fillStyle = '#333'
    ctx.font = '70px sans-serif'
    ;['1 der Hund', '2 die Wiese', '3 süß', '4 der Wald', '5 rund'].forEach((t, i) => ctx.fillText(t, -500, -300 + i * 140))
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
  })
  await page.locator('input[type=file]').first().setInputFiles({ name: 'ausschnitt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') })
}

/** Accepts the prepared photo in the check dialog. */
export async function acceptPhoto(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Foto prüfen' })
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  await dialog.getByRole('button', { name: 'Passt!' }).click()
}


/** Picks a club in the player form like a keyboard user: the swipe row brings it into view. */
export async function chooseClub(scope: Locator, name: string): Promise<void> {
  const club = scope.getByRole('radio', { name, exact: true })
  await club.focus()
  await club.press('Space')
  await expect(club).toBeChecked()
}

/** Sets the shirt number on the two digit rolls (tens, ones) by typing a digit into each. */
export async function setShirtNumber(scope: Locator, value: number): Promise<void> {
  await scope.getByRole('spinbutton', { name: 'Zehner' }).press(String(Math.floor(value / 10)))
  await scope.getByRole('spinbutton', { name: 'Einer' }).press(String(value % 10))
}
