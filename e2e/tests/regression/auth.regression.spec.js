import { test, expect } from '@playwright/test';

// Tests run fully parallel (playwright.config.js), so uniqueness must hold
// across worker processes, not just across time. Mixing in the worker index
// alongside the millisecond timestamp and a random digit keeps two workers
// from ever generating the same mobile number even if they start in the same
// millisecond.
function uniqueAuthUser(workerIndex = 0) {
  const ms = Date.now();
  const rand = Math.floor(Math.random() * 100);
  const stamp = `${ms}${rand}`;
  return {
    email: `e2e${stamp}@example.com`,
    mobile: `9${workerIndex % 10}${String(ms).slice(-7)}${rand % 10}`,
    username: `e2e${String(ms).slice(-9)}${rand % 10}`,
    password: 'E2EStr0ng!!Pass',
  };
}

async function signUp(page, user) {
  await page.goto('/signup');
  await page.getByTestId('signup-email-input').fill(user.email);
  await page.getByTestId('signup-mobile-input').fill(user.mobile);
  if (user.username) {
    await page.getByTestId('signup-username-input').fill(user.username);
  }
  await page.getByTestId('signup-password-input').fill(user.password);
  await page.getByTestId('signup-confirm-password-input').fill(user.password);
  await page.getByTestId('signup-submit-button').click();
}

test.describe('login, signup, and forgot/reset password', () => {
  test('[E2E-REG-029] the "Log in" link in the header navigates to the login page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-login-link').click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test('[E2E-REG-030] signing up with valid details shows a success message linking back to login', async ({ page }, testInfo) => {
    const user = uniqueAuthUser(testInfo.parallelIndex);
    await signUp(page, user);

    await expect(page.getByTestId('signup-success')).toBeVisible();
    await page.getByTestId('login-link').click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('[E2E-REG-031] logging in with the newly created username succeeds and shows a welcome message', async ({ page }, testInfo) => {
    const user = uniqueAuthUser(testInfo.parallelIndex);
    await signUp(page, user);
    await expect(page.getByTestId('signup-success')).toBeVisible();

    await page.goto('/login');
    await page.getByTestId('login-id-input').fill(user.username);
    await page.getByTestId('login-password-input').fill(user.password);
    await page.getByTestId('login-submit-button').click();

    await expect(page.getByTestId('login-success')).toBeVisible();
    await expect(page.getByTestId('login-success')).toContainText(user.username);
  });

  test('[E2E-REG-032] logging in with the wrong password shows an inline error', async ({ page }, testInfo) => {
    const user = uniqueAuthUser(testInfo.parallelIndex);
    await signUp(page, user);
    await expect(page.getByTestId('signup-success')).toBeVisible();

    await page.goto('/login');
    await page.getByTestId('login-id-input').fill(user.email);
    await page.getByTestId('login-password-input').fill('TotallyWrong!!1');
    await page.getByTestId('login-submit-button').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-success')).not.toBeVisible();
  });

  test('[E2E-REG-033] signing up with a weak password shows a validation error and does not create the account', async ({ page }, testInfo) => {
    const user = uniqueAuthUser(testInfo.parallelIndex);
    user.password = 'weak';
    await signUp(page, user);

    await expect(page.getByTestId('signup-error')).toBeVisible();
    await expect(page.getByTestId('signup-success')).not.toBeVisible();

    await page.goto('/login');
    await page.getByTestId('login-id-input').fill(user.email);
    await page.getByTestId('login-password-input').fill('weak');
    await page.getByTestId('login-submit-button').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('[E2E-REG-034] the forgot-password to reset-password round trip lets the user log in with a new password', async ({ page }, testInfo) => {
    const user = uniqueAuthUser(testInfo.parallelIndex);
    await signUp(page, user);
    await expect(page.getByTestId('signup-success')).toBeVisible();

    await page.goto('/forgot-password');
    await page.getByTestId('forgot-password-login-id-input').fill(user.email);
    await page.getByTestId('forgot-password-submit-button').click();
    await expect(page.getByTestId('forgot-password-success')).toBeVisible();

    await page.getByTestId('reset-password-link').click();
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await expect(page.getByTestId('reset-password-token-input')).not.toHaveValue('');

    const newPassword = 'BrandNew!!Pass9';
    await page.getByTestId('reset-password-new-password-input').fill(newPassword);
    await page.getByTestId('reset-password-confirm-password-input').fill(newPassword);
    await page.getByTestId('reset-password-submit-button').click();
    await expect(page.getByTestId('reset-password-success')).toBeVisible();

    await page.getByTestId('login-link').click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByTestId('login-id-input').fill(user.email);
    await page.getByTestId('login-password-input').fill(newPassword);
    await page.getByTestId('login-submit-button').click();
    await expect(page.getByTestId('login-success')).toBeVisible();
  });

  test('[E2E-REG-035] logging in with an unrecognized login ID shows an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-id-input').fill('no-such-account@example.com');
    await page.getByTestId('login-password-input').fill('DoesNotMatter!!1');
    await page.getByTestId('login-submit-button').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
  });
});
