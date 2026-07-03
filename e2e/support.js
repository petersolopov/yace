// isKey derives ctrl/cmd from navigator.platform at load, so the browser under
// test decides the modifier: Meta on Mac engines, Control elsewhere (Linux CI)
export async function modifierKey(page) {
  const isMac = await page.evaluate(() =>
    /Mac|iPod|iPhone|iPad/.test(navigator.platform),
  );
  return isMac ? "Meta" : "Control";
}

export function caretRange(textarea) {
  return textarea.evaluate((el) => [el.selectionStart, el.selectionEnd]);
}

// Home/End move the caret inconsistently in textareas across engines on macOS,
// so caret setup navigates with arrow keys from the known post-typing position
export async function press(page, key, times = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
  }
}
