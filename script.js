const POLL_ENDPOINT =
  "https://lougrozaaward.com/wp-admin/admin-ajax.php?action=totalpoll";
const POLL_ID = "6085";
const PROXY_PREFIX = "https://corsproxy.io/?";
const REFRESH_INTERVAL_MS = 60_000;
const FINALIST_LABELS = ["Aidan Birr", "Kansei Matsuzawa", "Tate Sandell"];

const refreshButton = document.getElementById("refresh-button");
const statusMessage = document.getElementById("status-message");
const lastUpdatedEl = document.getElementById("last-updated");
const tableRows = Array.from(
  document.querySelectorAll("#results-table-body tr")
);

const chart = new Chart(document.getElementById("results-chart"), {
  type: "bar",
  data: {
    labels: FINALIST_LABELS,
    datasets: [
      {
        label: "Vote share (%)",
        data: [0, 0, 0],
        backgroundColor: [
          "rgba(56, 189, 248, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(248, 113, 113, 0.8)",
        ],
        borderRadius: 6,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: {
        ticks: {
          callback(value) {
            return `${value}%`;
          },
        },
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Vote share",
        },
      },
    },
    animation: {
      duration: 600,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label(context) {
            return `${context.dataset.label}: ${context.formattedValue}`;
          },
        },
      },
    },
  },
});

async function fetchPollResults() {
  setStatus("Fetching latest results…");

  try {
    const proxyUrl = PROXY_PREFIX + encodeURIComponent(POLL_ENDPOINT);
    const formData = new URLSearchParams();
    formData.append("totalpoll[pollId]", POLL_ID);
    formData.append("totalpoll[action]", "results");
    formData.append("totalpoll[screen]", "results");

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Upstream responded with ${response.status}`);
    }

    const html = await response.text();
    const voteMap = extractVotePercentages(html);

    if (!voteMap || voteMap.size < FINALIST_LABELS.length) {
      throw new Error("Could not locate vote percentages in the response HTML");
    }

    updateVisuals(voteMap);
    setStatus("Updated successfully.", "success");
  } catch (error) {
    console.error(error);
    setStatus(
      `Failed to refresh: ${error.message}. Try again later or replace the proxy.`,
      "error"
    );
  }
}

function extractVotePercentages(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const rows = Array.from(
    doc.querySelectorAll(".totalpoll-question-choices-item")
  );

  if (!rows.length) {
    return null;
  }

  const results = new Map();

  rows.forEach((row) => {
    const label = row
      .querySelector(".totalpoll-question-choices-item-label span")
      ?.textContent?.trim();
    const text = row
      .querySelector(".totalpoll-question-choices-item-votes-text")
      ?.textContent?.trim();

    if (!label || !text) return;

    const numeric = Number.parseFloat(text.replace(/[^\d.]/g, "")) || 0;
    results.set(label, numeric);
  });

  return results;
}

function updateVisuals(voteMap) {
  const values = FINALIST_LABELS.map(
    (label) => voteMap.get(label) ?? voteMap.get(label.toUpperCase()) ?? 0
  );

  chart.data.datasets[0].data = values;
  chart.update();

  values.forEach((pct, index) => {
    const cell = tableRows[index]?.querySelector('[data-label="Votes"]');
    if (cell) {
      cell.textContent = `${pct.toFixed(2)}%`;
    }
  });

  lastUpdatedEl.textContent = new Date().toLocaleTimeString();
}

function setStatus(message, tone = "info") {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
}

refreshButton.addEventListener("click", () => {
  fetchPollResults();
});

fetchPollResults();
setInterval(fetchPollResults, REFRESH_INTERVAL_MS);

