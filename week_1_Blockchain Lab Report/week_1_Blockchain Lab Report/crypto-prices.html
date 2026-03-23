<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cryptocurrency Price Table</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-6">
  <div class="max-w-4xl w-full bg-white rounded-2xl shadow-lg p-8">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-3xl font-bold text-gray-800">Cryptocurrency Price Table</h1>
      <div class="flex items-center gap-2">
        <span id="status-dot" class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
        <span id="status-text" class="text-sm font-medium text-green-600">실시간</span>
      </div>
    </div>
    <p class="text-gray-500 mb-6">
      CoinGecko API에서 가져온 Bitcoin과 Ethereum의 가격 정보입니다.
      <br>마지막 조회: <span id="last-updated" class="font-medium">로딩 중...</span>
      <span class="mx-2">|</span>
      다음 갱신까지: <span id="countdown" class="font-medium text-blue-600">30</span>초
      <span class="text-gray-400">(30초 주기)</span>
    </p>

    <!-- 갱신 진행 바 -->
    <div class="w-full bg-gray-200 rounded-full h-1.5 mb-6">
      <div id="progress-bar" class="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style="width: 100%"></div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-800 text-white">
            <th class="px-6 py-3 rounded-tl-lg">코인</th>
            <th class="px-6 py-3">USD 가격</th>
            <th class="px-6 py-3">KRW 가격</th>
            <th class="px-6 py-3">24시간 변동률</th>
            <th class="px-6 py-3 rounded-tr-lg">시가총액 (USD)</th>
          </tr>
        </thead>
        <tbody id="price-table-body">
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-gray-400">데이터를 불러오는 중...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-6 flex items-center justify-between text-sm text-gray-400">
      <p>데이터 출처:
        <a href="https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,krw&include_24hr_change=true&include_market_cap=true"
           class="text-blue-500 hover:underline" target="_blank">
          CoinGecko API
        </a>
      </p>
      <button onclick="fetchPrices()" class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
        수동 갱신
      </button>
    </div>
  </div>

  <script>
    const REFRESH_INTERVAL = 30; // 갱신 주기 (초)
    let countdown = REFRESH_INTERVAL;
    let countdownTimer = null;

    // 숫자 포맷팅 (천 단위 콤마)
    function formatNumber(num, decimals = 0) {
      return num.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    // 현재 시각 문자열
    function getCurrentTime() {
      const now = new Date();
      return now.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }

    // CoinGecko API URL
    const API_URL =
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,krw&include_24hr_change=true&include_market_cap=true";

    // CORS 프록시 목록 (직접 호출 실패 시 순서대로 시도)
    const CORS_PROXIES = [
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];

    // 가격 데이터 fetch
    async function fetchPrices() {
      const statusDot = document.getElementById("status-dot");
      const statusText = document.getElementById("status-text");

      // 로딩 상태 표시
      statusDot.className = "w-3 h-3 rounded-full bg-yellow-400 animate-pulse";
      statusText.textContent = "갱신 중...";
      statusText.className = "text-sm font-medium text-yellow-600";

      // 1) 직접 호출 시도
      let data = await tryFetch(API_URL);

      // 2) 실패 시 CORS 프록시 순서대로 시도
      if (!data) {
        for (const proxy of CORS_PROXIES) {
          data = await tryFetch(proxy(API_URL));
          if (data) break;
        }
      }

      if (data) {
        updateTable(data);
        statusDot.className = "w-3 h-3 rounded-full bg-green-500 animate-pulse";
        statusText.textContent = "실시간";
        statusText.className = "text-sm font-medium text-green-600";
        document.getElementById("last-updated").textContent = getCurrentTime();
      } else {
        console.error("모든 API 호출 실패");
        statusDot.className = "w-3 h-3 rounded-full bg-red-500";
        statusText.textContent = "오류 발생";
        statusText.className = "text-sm font-medium text-red-600";
      }

      // 카운트다운 리셋
      resetCountdown();
    }

    // fetch 시도 (성공 시 JSON, 실패 시 null)
    async function tryFetch(url) {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        // 응답에 bitcoin 키가 있는지 검증
        if (data && data.bitcoin && data.bitcoin.usd) return data;
        return null;
      } catch (e) {
        return null;
      }
    }

    // 테이블 업데이트
    function updateTable(data) {
      const coins = [
        {
          id: "bitcoin",
          name: "Bitcoin (BTC)",
          colorClass: "text-orange-500",
        },
        {
          id: "ethereum",
          name: "Ethereum (ETH)",
          colorClass: "text-indigo-500",
        },
      ];

      const tbody = document.getElementById("price-table-body");
      tbody.innerHTML = "";

      coins.forEach((coin, index) => {
        const info = data[coin.id];
        if (!info) return;

        const change = info.usd_24h_change;
        const changeText =
          change >= 0
            ? `+${change.toFixed(2)}%`
            : `${change.toFixed(2)}%`;
        const changeColor = change >= 0 ? "text-green-600" : "text-red-600";

        const tr = document.createElement("tr");
        tr.className =
          index === 0
            ? "border-b border-gray-200 hover:bg-gray-50 transition"
            : "hover:bg-gray-50 transition";

        tr.innerHTML = `
          <td class="px-6 py-4 font-semibold ${coin.colorClass}">${coin.name}</td>
          <td class="px-6 py-4">$${formatNumber(info.usd, 2)}</td>
          <td class="px-6 py-4">\u20A9${formatNumber(info.krw)}</td>
          <td class="px-6 py-4 ${changeColor} font-medium">${changeText}</td>
          <td class="px-6 py-4">$${formatNumber(info.usd_market_cap)}</td>
        `;

        tbody.appendChild(tr);
      });
    }

    // 카운트다운 리셋 및 시작
    function resetCountdown() {
      countdown = REFRESH_INTERVAL;
      document.getElementById("countdown").textContent = countdown;
      document.getElementById("progress-bar").style.width = "100%";

      if (countdownTimer) clearInterval(countdownTimer);

      countdownTimer = setInterval(() => {
        countdown--;
        document.getElementById("countdown").textContent = countdown;
        const percent = (countdown / REFRESH_INTERVAL) * 100;
        document.getElementById("progress-bar").style.width = percent + "%";

        if (countdown <= 0) {
          clearInterval(countdownTimer);
          fetchPrices();
        }
      }, 1000);
    }

    // 초기 실행
    fetchPrices();
  </script>
</body>
</html>
