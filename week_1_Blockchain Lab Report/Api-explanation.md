# CoinGecko API 설명서

## 1. 사용 중인 API

### CoinGecko Simple Price API

```
GET https://api.coingecko.com/api/v3/simple/price
```

암호화폐의 현재 가격을 간단하게 조회할 수 있는 엔드포인트이다.
회원가입이나 API Key 없이 바로 사용 가능하다.

### 요청 파라미터

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `ids` | `bitcoin,ethereum` | 조회할 코인 ID (쉼표로 구분) |
| `vs_currencies` | `usd,krw` | 표시할 통화 (미국 달러, 한국 원) |
| `include_24hr_change` | `true` | 24시간 가격 변동률 포함 여부 |
| `include_market_cap` | `true` | 시가총액 포함 여부 |

### 전체 요청 URL

```
https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,krw&include_24hr_change=true&include_market_cap=true
```

### 응답 예시

```json
{
  "bitcoin": {
    "usd": 68161,
    "usd_market_cap": 1362622871051,
    "usd_24h_change": -1.78,
    "krw": 102832426,
    "krw_market_cap": 2055548660441610,
    "krw_24h_change": -1.78
  },
  "ethereum": {
    "usd": 2052.86,
    "usd_market_cap": 247712319075,
    "usd_24h_change": -2.95,
    "krw": 3097097,
    "krw_market_cap": 372603217562635,
    "krw_24h_change": -2.95
  }
}
```

### 응답 필드 설명

| 필드 | 의미 | 예시 |
|------|------|------|
| `usd` | 미국 달러 기준 현재 가격 | 68161 ($68,161) |
| `krw` | 한국 원 기준 현재 가격 | 102832426 (₩102,832,426) |
| `usd_24h_change` | 24시간 동안 USD 기준 가격 변동률 (%) | -1.78 (-1.78%) |
| `usd_market_cap` | USD 기준 시가총액 | 약 $1.36T |

---

## 2. 코드에서 API를 호출하는 방식

### 2-1. 호출 흐름

```
fetchPrices() 실행
  │
  ├─ 1단계: CoinGecko API 직접 호출
  │         fetch("https://api.coingecko.com/api/v3/simple/price?...")
  │         성공 → 데이터 사용
  │         실패 ↓
  │
  ├─ 2단계: CORS 프록시 #1 (allorigins.win) 경유 시도
  │         실패 ↓
  │
  ├─ 3단계: CORS 프록시 #2 (corsproxy.io) 경유 시도
  │         실패 ↓
  │
  └─ 4단계: CORS 프록시 #3 (codetabs.com) 경유 시도
             실패 → "오류 발생" 표시
```

### 2-2. 직접 호출 코드

```javascript
const API_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,krw&include_24hr_change=true&include_market_cap=true";

let data = await tryFetch(API_URL);
```

브라우저의 `fetch()` 함수로 CoinGecko 서버에 HTTP GET 요청을 보낸다.

### 2-3. 응답 검증 코드

```javascript
async function tryFetch(url) {
  const response = await fetch(url);
  if (!response.ok) return null;           // HTTP 상태 코드 확인 (200이 아니면 실패)
  const data = await response.json();      // JSON 파싱
  if (data && data.bitcoin && data.bitcoin.usd) return data;  // 데이터 구조 검증
  return null;
}
```

2단계로 검증한다:
1. `response.ok` → HTTP 상태가 200번대인지 확인
2. `data.bitcoin.usd` → 응답 데이터에 실제로 비트코인 가격이 들어있는지 확인

### 2-4. CORS 프록시 폴백 코드

```javascript
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

if (!data) {
  for (const proxy of CORS_PROXIES) {
    data = await tryFetch(proxy(API_URL));
    if (data) break;  // 하나라도 성공하면 중단
  }
}
```

직접 호출이 실패하면 프록시 서버를 경유한다.
프록시는 **서버 → 서버**로 요청하기 때문에 CORS 제한을 받지 않는다.

---

## 3. 교실에서 API가 됐다 안됐다 하는 이유

### 3-1. 근본 원인: Rate Limit (요청 횟수 제한)

CoinGecko 무료 플랜은 **IP 주소 기준**으로 요청 횟수를 제한한다.

| 플랜 | 제한 | 비용 |
|------|------|------|
| **무료** | **분당 10~30회** | 무료 |
| Demo | 분당 30회 | 무료 (API Key 필요) |
| Analyst | 분당 500회 | $14/월 |
| Pro | 분당 1,000회 | $49/월 |

### 3-2. 왜 교실에서 특히 문제인가?

```
학생 A의 노트북 ──┐
학생 B의 노트북 ──┤
학생 C의 노트북 ──┼── 교실 Wi-Fi 공유기 ── 공인 IP 1개 ── CoinGecko 서버
...               │
학생 30명 ────────┘
```

**핵심**: 같은 Wi-Fi에 연결된 모든 기기는 **하나의 공인 IP**로 인터넷에 나간다.

CoinGecko 입장에서는 30명의 학생이 아니라 **1개의 IP에서 대량 요청이 오는 것**으로 인식한다.

### 3-3. 구체적인 계산

- 30명의 학생이 동시에 페이지 열기 → 즉시 30번 호출
- 각 학생이 30초마다 자동 갱신 → 분당 학생 1명당 2회
- 30명 × 2회 = **분당 60회** → 무료 한도(10~30회) 초과

### 3-4. 해결 방법

| 방법 | 설명 | 난이도 |
|------|------|--------|
| **갱신 주기 늘리기** | 30초 → 60초~120초로 변경 | 쉬움 |
| **CoinGecko Demo Key 사용** | 무료 API Key 발급받으면 개인별 한도 분리 | 쉬움 |
| **모바일 핫스팟 사용** | 각자 다른 IP로 나가므로 한도 분리 | 쉬움 |
| **서버 프록시 + 캐시** | 서버에서 1번만 호출하고 결과를 캐시해서 공유 | 중간 |
| **유료 플랜** | 분당 500회 이상 사용 가능 | 비용 발생 |

---

## 4. CORS란?

### 4-1. 개념

**CORS (Cross-Origin Resource Sharing)** = 교차 출처 리소스 공유

브라우저가 **다른 도메인의 API를 호출하는 것을 기본적으로 차단**하는 보안 정책이다.

```
내 웹페이지 (file:///crypto-prices.html)
      ↓ fetch() 호출
CoinGecko (https://api.coingecko.com)
      ↓
브라우저: "출처가 다르니까 차단!" → CORS 에러
```

### 4-2. 왜 존재하는가?

악성 웹사이트가 사용자 모르게 다른 서비스의 API를 호출하는 것을 막기 위한 **브라우저 보안 장치**이다.

### 4-3. 해결 방법

| 방법 | 설명 | 이 프로젝트에서 |
|------|------|-----------------|
| 서버에서 CORS 헤더 추가 | API 서버가 `Access-Control-Allow-Origin: *` 응답 | CoinGecko가 해줘야 함 (통제 불가) |
| **CORS 프록시 경유** | 중간 서버가 대신 요청 | **crypto-prices.html에서 사용** |
| **서버 사이드 호출** | 별도 백엔드나 서버에서 API 호출 | 현재 정적 HTML 파일에서는 사용하지 않음 |

- `crypto-prices.html` → CORS 프록시 3개를 폴백으로 사용
- 서버 사이드 호출 방식은 현재 제출 파일에는 포함되어 있지 않음