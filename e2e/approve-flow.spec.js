const { test, expect } = require('@playwright/test');

async function login(page, email) {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

async function signOut(page) {
  await page.getByRole('button', { name: 'Sign out' }).click();
}

test('employee applies, manager approves, status and balance update', async ({ page }) => {
  await login(page, 'ishara@ceylonroots.lk');
  await page.getByLabel('Start date').fill('2026-03-09'); // Mon
  await page.getByLabel('End date').fill('2026-03-13');   // Fri — 5 working days
  await page.getByLabel('Reason').fill('Family trip');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible();
  await signOut(page);

  await login(page, 'ruwan@ceylonroots.lk'); // Ishara's manager
  await page.getByRole('button', { name: 'Approvals' }).click();
  await expect(page.getByText('Ishara Fernando')).toBeVisible();
  await expect(page.getByText('No one else is off')).toBeVisible();
  await page.getByRole('button', { name: 'Approve' }).first().click();
  await expect(page.getByText('No pending requests')).toBeVisible();
  await signOut(page);

  await login(page, 'ishara@ceylonroots.lk');
  await expect(page.getByText('APPROVED', { exact: true })).toBeVisible();
  await expect(page.getByText('9 of 14 days left')).toBeVisible();
});
