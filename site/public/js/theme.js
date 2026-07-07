const STORAGE_KEY = "yace-theme";
const CHOICES = ["system", "light", "dark"];

function readChoice() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return CHOICES.includes(stored) ? stored : "system";
  } catch (e) {
    return "system";
  }
}

function applyChoice(choice) {
  // system leaves data-theme off so the prefers-color-scheme media query drives the palette
  if (choice === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = choice;
  }
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch (e) {}
}

export default function initTheme() {
  const options = document.querySelectorAll(".theme-switch__option");
  if (!options.length) return;

  // the visual active state is CSS driven by data-theme; JS only mirrors aria
  const reflect = (choice) => {
    for (const option of options) {
      const active = option.dataset.themeChoice === choice;
      option.setAttribute("aria-pressed", String(active));
    }
  };

  // the inline head script already set data-theme; only sync aria here
  reflect(readChoice());

  for (const option of options) {
    option.addEventListener("click", () => {
      const choice = option.dataset.themeChoice;
      applyChoice(choice);
      reflect(choice);
    });
  }
}
