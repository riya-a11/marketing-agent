import { test, expect } from '@playwright/test';

test('landing page has correct title and link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('NexusAI');
  const getStartedLink = page.getByRole('link', { name: /Get Started/i });
  await expect(getStartedLink).toBeVisible();
});

test('login page has form inputs', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible();
});

test('onboarding chat page has progress bar and inputs', async ({ page }) => {
  await page.goto('/onboarding/chat');
  await expect(page.getByText('Brand Discovery')).toBeVisible();
  await expect(page.getByPlaceholder('Type your answer...')).toBeVisible();
});
