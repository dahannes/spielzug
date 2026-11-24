import { expect, test, type Page } from '@playwright/test'
import { acceptPhoto, signUpAndStart, uploadSkewedSheet, uploadTiltedLines } from './helpers.ts'

const size = (page: Page) =>
  page.getByRole('img', { name: 'Scan' }).evaluate(async (img: HTMLImageElement) => {
    await img.decode()
    return { width: img.naturalWidth, height: img.naturalHeight }
  })

test('[SR-30][SR-42] debug view: a whole page is straightened and sent for analysis right away', async ({ page }) => {
  await signUpAndStart(page)
  await page.goto('/debug/scan')

  await uploadSkewedSheet(page)
  await acceptPhoto(page)
  await expect(page.getByRole('img', { name: 'Scan' })).toBeVisible()
  // Landscape photo of a portrait sheet on a dark table: the sheet is warped upright and cropped to the writing
  const { width, height } = await size(page)
  expect(height).toBeGreaterThan(width)
  // AI_FAKE answers with one item
  await expect(page.getByRole('cell', { name: 'die Wise' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nochmal analysieren' })).toBeVisible()
})

test('[SR-30] a photo of a part of a page is levelled and cropped to the writing; the check can rotate it', async ({ page }) => {
  await signUpAndStart(page)
  await page.goto('/debug/scan')

  await uploadTiltedLines(page)
  const dialog = page.getByRole('dialog', { name: 'Foto prüfen' })
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  const before = await dialog.getByRole('img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])
  await dialog.getByRole('button', { name: '↻ Drehen' }).click()
  await expect
    .poll(() => dialog.getByRole('img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]))
    .toEqual([before[1], before[0]])
  await dialog.getByRole('button', { name: '↻ Drehen' }).click()
  await dialog.getByRole('button', { name: '↻ Drehen' }).click()
  await dialog.getByRole('button', { name: '↻ Drehen' }).click()
  await dialog.getByRole('button', { name: 'Passt!' }).click()

  // Cropped to the five lines: far smaller than the 2000 × 1500 photo
  const { width, height } = await size(page)
  expect(width).toBeLessThan(800)
  expect(height).toBeLessThan(900)
})
