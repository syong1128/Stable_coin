# crypto-prices.html 코드 설명

## 1. HTML 구조 (1~61번 줄)

### 상태 표시 영역 (11~16번 줄)
```html
<span id="status-dot" class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
<span id="status-text" class="text-sm font-medium text-green-600">실시간</span>
```
- 우측 상단에 초록색 점이 깜빡이며 현재 API 연결 상태를 표시
- 상태 3가지: **실시간**(초록) / **갱신 중**(노랑) / **오류 발생**(빨강)

### 카운트다운 + 프로그레스 바 (18~29번 줄)
```html
다음 갱신까지: <span id="countdown">30</span>초
<div id="progress-bar" class="bg-blue-500 h-1.5 rounded-full" style="width: 100%"></div>
```
- 다음 API 호출까지 남은 초를 숫자로 표시
- 파란색 바가 100% → 0%로 줄어들며 시각적으로 갱신 주기를 보여줌

### 가격 테이블 (31~48번 줄)
```html
<tbody id="price-table-body">
  <tr>
    <td colspan="5">데이터를 불러오는 중...</td>
  </tr>
</tbody>
```
- 초기에는 "로딩 중" 메시지 표시
- JavaScript가 API 데이터를 받아오면 `tbody` 내용을 동적으로 교체

---

## 2. JavaScript 핵심 로직 (63~222번 줄)

### 2-1. CORS 프록시 폴백 전략 (93~98번 줄)
```javascript
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];
```
- **문제**: 브라우저에서 CoinGecko API를 직접 호출하면 CORS 정책으로 차단될 수 있음
- **해결**: 직접 호출 실패 시 3개의 무료 CORS 프록시를 순서대로 시도
- 하나라도 성공하면 그 데이터를 사용

### 2-2. 가격 데이터 가져오기 - fetchPrices() (100~136번 줄)
```javascript
async function fetchPrices() {
  // 1) 직접 호출 시도
  let data = await tryFetch(API_URL);

  // 2) 실패 시 CORS 프록시 순서대로 시도
  if (!data) {
    for (const proxy of CORS_PROXIES) {
      data = await tryFetch(proxy(API_URL));
      if (data) break;
    }
  }
}
```
- 전체 데이터 흐름의 **핵심 함수**
- 호출 순서: 상태를 "갱신 중"으로 변경 → API 호출 → 성공 시 테이블 업데이트 → 카운트다운 리셋

### 2-3. API 응답 검증 - tryFetch() (138~150번 줄)
```javascript
async function tryFetch(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  if (data && data.bitcoin && data.bitcoin.usd) return data;
  return null;
}
```
- `fetch()`로 데이터를 받아온 뒤, `response.ok`와 `data.bitcoin.usd` 존재 여부를 이중 검증
- 실패 시 `null`을 반환하여 다음 프록시로 넘어감

### 2-4. 테이블 동적 렌더링 - updateTable() (152~197번 줄)
```javascript
coins.forEach((coin) => {
  const change = info.usd_24h_change;
  const changeColor = change >= 0 ? "text-green-600" : "text-red-600";
  tr.innerHTML = `...`;
  tbody.appendChild(tr);
});
```
- API 응답 데이터로 `<tr>` 요소를 직접 생성하여 테이블에 삽입
- 24시간 변동률이 **양수면 초록색**, **음수면 빨간색**으로 표시

### 2-5. 카운트다운 타이머 - resetCountdown() (199~218번 줄)
```javascript
countdownTimer = setInterval(() => {
  countdown--;
  const percent = (countdown / REFRESH_INTERVAL) * 100;
  document.getElementById("progress-bar").style.width = percent + "%";

  if (countdown <= 0) {
    clearInterval(countdownTimer);
    fetchPrices(); // 0이 되면 다시 API 호출
  }
}, 1000);
```
- `setInterval`로 1초마다 카운트다운 감소
- 프로그레스 바의 `width`를 백분율로 계산하여 줄여나감
- 카운트가 0이 되면 `fetchPrices()`를 다시 호출 → **30초 자동 갱신 사이클 완성**

---

## 3. 전체 데이터 흐름 요약

```
페이지 로드
  └→ fetchPrices() 호출
       ├→ CoinGecko API 직접 호출 시도
       │    실패 시 → CORS 프록시 3개 순차 시도
       ├→ 성공: updateTable()로 테이블 갱신 + 상태 "실시간"
       │  실패: 상태 "오류 발생"
       └→ resetCountdown() → 30초 카운트다운 시작
                               └→ 0초 도달 시 fetchPrices() 재호출 (반복)
```
