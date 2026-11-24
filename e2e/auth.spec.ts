import { expect, test, type Page } from '@playwright/test'
import { PASSWORD, signUp } from './helpers.ts'
import { readLoginCode } from './mailpit.ts'

async function signOutFromStart(page: Page) {
  await expect(page.getByRole('heading', { name: 'Wer spielt?' })).toBeVisible()
  await page.getByRole('button', { name: 'Abmelden' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByLabel('Passwort').fill(password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
}

test('[SR-01] parent signs up with email and password, confirms by code and signs in again', async ({ page }) => {
  const email = await signUp(page)
  await signOutFromStart(page)

  await signIn(page, email, 'falsches-passwort')
  await expect(page.getByText('E-Mail oder Passwort stimmt nicht.')).toBeVisible()

  await signIn(page, email, PASSWORD)
  await expect(page.getByRole('heading', { name: 'Wer spielt?' })).toBeVisible()
})

test('[SR-01] a forgotten password is reset with an emailed code', async ({ page }) => {
  const email = await signUp(page)
  await signOutFromStart(page)

  await page.getByRole('button', { name: 'Passwort vergessen?' }).click()
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByRole('button', { name: 'Code senden' }).click()
  await page.getByLabel('Code aus der E-Mail').fill(await readLoginCode(email, 2))
  await page.getByLabel('Neues Passwort').fill('ganz-neu-5678')
  await page.getByRole('button', { name: 'Passwort speichern' }).click()
  await signOutFromStart(page)

  await signIn(page, email, 'ganz-neu-5678')
  await expect(page.getByRole('heading', { name: 'Wer spielt?' })).toBeVisible()
})

test('[SR-01] passwords need at least 8 characters', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Noch kein Konto? Konto erstellen' }).click()
  await page.getByLabel('E-Mail-Adresse').fill('kurz@example.test')
  await page.getByLabel('Passwort').fill('1234567')
  await page.getByRole('button', { name: 'Konto erstellen' }).click()
  await expect(page.getByText('Das Passwort braucht mindestens 8 Zeichen.')).toBeVisible()
})
