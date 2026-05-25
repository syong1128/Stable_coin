const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:0.6b";
const FRONTEND_DIR = path.join(__dirname, "frontend");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("요청 본문이 너무 큽니다."));
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function normalizeText(value, fallback = "-") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).trim();
}

function normalizeNumber(value, fallback = "-") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const rawText = String(value).replace(/,/g, "").trim();
  const numberValue = Number(rawText);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectCategory(store, items, categoryHint) {
  const allowedCategories = ["카페/식비", "편의점/소매", "교통", "교육", "기타"];
  const hint = normalizeText(categoryHint, "");

  /*
    프론트에서 넘겨준 categoryHint를 가장 먼저 믿습니다.
    예: Bus Pass|50|교통 → categoryHint = 교통
  */
  if (allowedCategories.includes(hint)) {
    return hint;
  }

  const itemText = String(items || "").toLowerCase();
  const storeText = String(store || "").toLowerCase();

  /*
    중요:
    상점명이 KMU Cafe여도 상품명이 Bus Pass면 교통이어야 합니다.
    그래서 상품명을 먼저 보고, 상점명은 마지막 보조 기준으로만 봅니다.
  */

  if (
    hasAny(itemText, [
      "bus",
      "subway",
      "taxi",
      "pass",
      "transport",
      "metro",
      "버스",
      "지하철",
      "택시",
      "교통",
      "교통카드"
    ])
  ) {
    return "교통";
  }

  if (
    hasAny(itemText, [
      "book",
      "textbook",
      "course",
      "class",
      "school",
      "lecture",
      "tuition",
      "책",
      "교재",
      "수업",
      "강의",
      "학교",
      "교육",
      "학습"
    ])
  ) {
    return "교육";
  }

  if (
    hasAny(itemText, [
      "convenience",
      "snack",
      "mart",
      "store",
      "water",
      "goods",
      "편의점",
      "간식",
      "마트",
      "소매",
      "생수",
      "물품"
    ])
  ) {
    return "편의점/소매";
  }

  if (
    hasAny(itemText, [
      "cafe",
      "coffee",
      "americano",
      "latte",
      "sandwich",
      "tea",
      "dessert",
      "drink",
      "카페",
      "커피",
      "아메리카노",
      "라떼",
      "카페라떼",
      "샌드위치",
      "디저트",
      "음료"
    ])
  ) {
    return "카페/식비";
  }

  /*
    상품명으로 판단이 안 될 때만 상점명을 참고합니다.
    이 부분 때문에 Custom Item + KMU Cafe는 카페/식비로 잡힐 수 있습니다.
  */
  if (
    hasAny(storeText, [
      "cafe",
      "coffee",
      "restaurant",
      "food",
      "카페",
      "커피",
      "식당",
      "음식"
    ])
  ) {
    return "카페/식비";
  }

  return "기타";
}

function buildPrompt(payment) {
  const rawItems = Array.isArray(payment.items)
    ? payment.items.join(", ")
    : normalizeText(
        payment.items || payment.item || payment.product || payment.productName,
        "상품 정보 없음"
      );

  const store = normalizeText(payment.store, "KMU Cafe");
  const items = normalizeText(rawItems, "상품 정보 없음");
  const amount = normalizeNumber(payment.amount);
  const fee = normalizeNumber(payment.fee);
  const settlement = normalizeNumber(payment.settlement);
  const network = normalizeText(payment.network, "GIWA Sepolia");
  const txHash = normalizeText(payment.txHash, "결제 전 미리보기");
  const category = detectCategory(store, items, payment.categoryHint);

  return `
너는 블록체인 결제 DApp의 스마트 영수증 분석 도우미다.

아래 규칙을 반드시 지켜라.
- 한국어로만 답한다.
- 정확히 3줄만 출력한다.
- 마크다운 기호, 불릿, 표, 코드블록을 쓰지 않는다.
- 결제 정보에 없는 내용을 지어내지 않는다.
- 소비 카테고리는 반드시 이 값 그대로 사용한다: ${category}
- "페어", "상점", "알 수 없음", "기타 카테고리" 같은 애매한 표현을 쓰지 않는다.
- 이 결제는 실제 상용 결제가 아니라 ${network} 테스트넷 기반 학습용 DApp 결제다.
- 거래 해시는 블록체인 기록 식별자라고만 짧게 설명한다.

[결제 정보]
상점: ${store}
상품: ${items}
결제 금액: ${amount} mKRW
수수료: ${fee} mKRW
가맹점 정산액: ${settlement} mKRW
소비 카테고리: ${category}
네트워크: ${network}
거래 해시: ${txHash}

[반드시 아래 형식 그대로 출력]
1. 결제 요약: ${store}에서 ${items} 상품을 ${amount} mKRW로 결제했습니다.
2. 소비 카테고리: ${category}
3. 정산 설명: 수수료 ${fee} mKRW를 제외한 ${settlement} mKRW가 가맹점 정산액으로 계산되었습니다.
`;
}

function buildFallbackReceipt(payment) {
  const rawItems = Array.isArray(payment.items)
    ? payment.items.join(", ")
    : normalizeText(
        payment.items || payment.item || payment.product || payment.productName,
        "상품 정보 없음"
      );

  const store = normalizeText(payment.store, "KMU Cafe");
  const items = normalizeText(rawItems, "상품 정보 없음");
  const amount = normalizeNumber(payment.amount);
  const fee = normalizeNumber(payment.fee);
  const settlement = normalizeNumber(payment.settlement);
  const category = detectCategory(store, items, payment.categoryHint);

  return [
    `1. 결제 요약: ${store}에서 ${items} 상품을 ${amount} mKRW로 결제했습니다.`,
    `2. 소비 카테고리: ${category}`,
    `3. 정산 설명: 수수료 ${fee} mKRW를 제외한 ${settlement} mKRW가 가맹점 정산액으로 계산되었습니다.`
  ].join("\n");
}

function cleanAiResponse(text, payment) {
  const fallback = buildFallbackReceipt(payment);

  if (!text || typeof text !== "string") {
    return fallback;
  }

  const category = detectCategory(
    normalizeText(payment.store, "KMU Cafe"),
    Array.isArray(payment.items)
      ? payment.items.join(", ")
      : normalizeText(payment.items || payment.item || payment.product || payment.productName, ""),
    payment.categoryHint
  );

  let cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*/g, "")
    .replace(/^- /gm, "")
    .trim();

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let validLines = lines.filter((line) => {
    return (
      line.startsWith("1.") ||
      line.startsWith("2.") ||
      line.startsWith("3.")
    );
  });

  /*
    Ollama가 3줄을 제대로 못 만들거나,
    카테고리를 이상하게 만들면 fallback으로 교체합니다.
  */
  if (validLines.length < 3) {
    return fallback;
  }

  validLines = validLines.slice(0, 3);

  const categoryLine = validLines[1] || "";

  if (!categoryLine.includes(category)) {
    return fallback;
  }

  if (
    cleaned.includes("페어") ||
    cleaned.includes("알 수 없음") ||
    cleaned.includes("기타 카테고리")
  ) {
    return fallback;
  }

  return validLines.join("\n");
}

async function handleAiReceipt(req, res) {
  try {
    const rawBody = await readBody(req);
    const payment = rawBody ? JSON.parse(rawBody) : {};
    const prompt = buildPrompt(payment);

    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: payment.model || OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0,
          num_predict: 180,
          top_p: 0.8,
          repeat_penalty: 1.1
        }
      })
    });

    if (!ollamaResponse.ok) {
      const text = await ollamaResponse.text();

      return sendJson(res, 502, {
        ok: false,
        error: `Ollama 응답 오류: ${ollamaResponse.status}`,
        detail: text,
        response: buildFallbackReceipt(payment)
      });
    }

    const data = await ollamaResponse.json();
    const cleanedResponse = cleanAiResponse(data.response, payment);

    return sendJson(res, 200, {
      ok: true,
      model: payment.model || OLLAMA_MODEL,
      response: cleanedResponse
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error.message || "AI 영수증 생성 중 오류가 발생했습니다."
    });
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(
    new URL(req.url, `http://localhost:${PORT}`).pathname
  );

  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(FRONTEND_DIR, safePath));

  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8"
      });

      res.end("파일을 찾을 수 없습니다.");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });

    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/ai-receipt") {
    handleAiReceipt(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, {
    ok: false,
    error: "지원하지 않는 요청입니다."
  });
});

server.listen(PORT, () => {
  console.log(`AI Smart Receipt DApp: http://localhost:${PORT}`);
  console.log(`Ollama URL: ${OLLAMA_URL}`);
  console.log(`Ollama model: ${OLLAMA_MODEL}`);
});