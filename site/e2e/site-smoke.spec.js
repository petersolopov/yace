import { test, expect } from "@playwright/test";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
};

test("landing serves from the root with a clean console", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  const failedResponses = [];
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/");

  await expect(page.locator(selectors.textarea)).toHaveCount(1);
  expect(errors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test("legacy /examples/ url serves a redirect stub to the landing", async ({
  request,
}) => {
  const stub = await request.get("/examples/");
  expect(stub.status()).toBe(200);
  expect(await stub.text()).toContain("url=../");
});

test("getting started editor accepts input and highlights it", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("#editor .yace-tok--kw").first()).toBeVisible();

  const textarea = page.locator(selectors.textarea);
  await textarea.click();
  await textarea.pressSequentially("xyzzy42");

  await expect(textarea).toHaveValue(/xyzzy42/);
  await expect(page.locator(selectors.pre).first()).toContainText("xyzzy42");
});

test("the examples section links out to the codesandbox demos", async ({
  page,
}) => {
  await page.goto("/");

  const links = page.locator(".examples__link");
  await expect(links).toHaveCount(6);

  for (let i = 0; i < 6; i++) {
    await expect(links.nth(i)).toBeVisible();
    expect(await links.nth(i).getAttribute("href")).toContain(
      "codesandbox.io/s/yace-",
    );
  }
});

test("the npm button copies the install command with feedback", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "clipboard read needs chromium permissions",
  );

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  const button = page.locator(".hero__button--primary");
  await button.click();

  await expect(button).toContainText("copied");
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe("npm install yace");
});

test("the page does not scroll horizontally on desktop", async ({ page }) => {
  await page.goto("/");

  // guards the full-bleed hero's 50vw-vs-scrollbar overshoot at desktop width
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBe(0);
});
