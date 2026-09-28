const { test, expect } = require('@playwright/test');

async function login(page, email) {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

// The capstone demo flow: "watch this 7 become 6.5". Uses Casual leave so it is
// independent of approve-flow.spec.js, which uses Annual.
test('employee books a Friday-afternoon half day; approval deducts 0.5', async ({ page }) => {
  await login(page, 'ishara@ceylonroots.lk');
  await page.getByLabel('Leave type').selectOption('2'); // Casual
  await page.getByLabel('Duration').selectOption('PM');
  await page.getByLabel('Date', { exact: true }).fill('2026-10-09'); // Friday
  await page.getByLabel('Reason').fill('Bank errand');
  await page.getByRole('button', { name: 'Apply' }).click();

  const myRow = page.locator('p', { hasText: 'Bank errand' });
  await expect(myRow).toContainText('(PM half day)');
  await expect(myRow).toContainText('PENDING');
  await expect(page.locator('p', { hasText: 'Casual' })).toContainText('(0.5 reserved by pending requests)');
  await page.getByRole('button', { name: 'Sign out' }).click();

  await login(page, 'ruwan@ceylonroots.lk');
  await page.getByRole('button', { name: 'Approvals' }).click();
  const inboxRow = page.locator('p', { hasText: 'Bank errand' });
  await expect(inboxRow).toContainText('PM half day');
  await expect(inboxRow).toContainText('0.5 day');
  await inboxRow.getByRole('button', { name: 'Approve' }).click();
  await expect(inboxRow).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();

  await login(page, 'ishara@ceylonroots.lk');
  await expect(page.locator('p', { hasText: 'Casual' })).toContainText('6.5 of 7 days left');
});
