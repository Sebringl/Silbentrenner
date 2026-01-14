const apiKeyInput = document.querySelector("#apiKey");
const modelInput = document.querySelector("#model");
const lyricsInput = document.querySelector("#lyricsInput");
const linesOutput = document.querySelector("#linesOutput");

const savedKey = localStorage.getItem("silbentrenner_api_key");
if (savedKey) {
  apiKeyInput.value = savedKey;
}

apiKeyInput.addEventListener("input", () => {
  localStorage.setItem("silbentrenner_api_key", apiKeyInput.value.trim());
});

let state = {
  lines: [],
  results: [],
};

function syncLines() {
  const lines = lyricsInput.value.split(/\r?\n/);
  const newResults = lines.map((line, index) => {
    if (state.lines[index] === line) {
      return state.results[index] ?? null;
    }
    return null;
  });
  state = { lines, results: newResults };
  render();
}

function render() {
  linesOutput.innerHTML = "";

  if (state.lines.length === 0 || (state.lines.length === 1 && state.lines[0] === "")) {
    const empty = document.createElement("p");
    empty.textContent = "Noch keine Zeilen eingegeben.";
    empty.className = "status";
    linesOutput.appendChild(empty);
    return;
  }

  state.lines.forEach((line, index) => {
    const row = document.createElement("div");
    row.className = "line-row";

    const left = document.createElement("div");
    left.className = "line-left";

    const number = document.createElement("div");
    number.className = "line-number";
    number.textContent = `${index + 1}.`;

    const button = document.createElement("button");
    button.className = "action-btn";
    button.type = "button";
    button.textContent = "+";
    button.setAttribute("aria-label", `Silben für Zeile ${index + 1} trennen`);

    const text = document.createElement("div");
    text.className = "line-text";
    text.textContent = line || "(leer)";

    left.append(number, button, text);

    const right = document.createElement("div");
    right.className = "syllable-output";
    right.textContent = state.results[index] || "Noch nicht getrennt.";

    row.append(left, right);
    linesOutput.appendChild(row);

    button.addEventListener("click", async () => {
      if (!apiKeyInput.value.trim()) {
        right.textContent = "Bitte zuerst einen API-Key eingeben.";
        return;
      }

      if (!line.trim()) {
        right.textContent = "Leere Zeile.";
        return;
      }

      button.disabled = true;
      right.textContent = "Trenne Silben...";

      try {
        const result = await syllabifyLine(line);
        state.results[index] = result;
        right.textContent = result;
      } catch (error) {
        right.textContent = `Fehler: ${error.message}`;
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function syllabifyLine(line) {
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || "gpt-4o-mini";
  const prompt = `Trenne die Zeile in deutsche Silben mit Bindestrichen und gib nur die getrennte Zeile zurück:\n${line}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API-Fehler (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const output = data.choices?.[0]?.message?.content?.trim();

  if (!output) {
    throw new Error("Keine Ausgabe erhalten.");
  }

  return output;
}

lyricsInput.addEventListener("input", syncLines);

syncLines();
