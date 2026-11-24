import { expect, test } from '@playwright/test'

test('[SR-51] redirects to login when signed out', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Anmeldung für Eltern')).toBeVisible()
})

test('[SR-50] has no horizontal scrollbar', async ({ page }) => {
  await page.goto('/login')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})
