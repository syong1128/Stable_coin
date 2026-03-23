# CoinGecko Live Tracker

Blockchain Lab #1 과제 - CoinGecko API를 활용한 Bitcoin & Ethereum 실시간 가격 추적 프로젝트

## 프로젝트 구조

```
Stable_coin/
├── crypto-prices.md          # 가격 테이블 (Markdown)
├── crypto-prices.html        # 실시간 가격 추적기 (단일 HTML)
├── code-explanation.md       # crypto-prices.html 코드 설명
├── README.md
└── crypto-price-app/         # Next.js 실시간 가격 웹 앱
    └── src/
        ├── app/
        │   ├── page.tsx              # 메인 페이지
        │   ├── layout.tsx            # 루트 레이아웃
        │   └── api/prices/route.ts   # CoinGecko API 프록시
        ├── components/
        │   └── PriceTable.tsx        # 실시간 가격 테이블 컴포넌트
        ├── lib/
        │   └── coingecko.ts          # CoinGecko API 호출 유틸리티
        └── types/
            └── crypto.ts             # TypeScript 타입 정의
```

## 기능

| 기능 | crypto-prices.html | crypto-price-app (Next.js) |
|------|-------------------|---------------------------|
| 실시간 가격 조회 | O | O |
| 30초 자동 갱신 | O | O |
| 카운트다운 타이머 | O | - |
| 프로그레스 바 | O | - |
| CORS 프록시 폴백 | O (3개 프록시) | 불필요 (서버 사이드) |
| 상태 표시 (실시간/오류) | O | O |
| 수동 새로고침 | O | O |
| 가격 상승/하락 색상 | O (초록/빨강) | O (초록/빨강) |

## 사용된 API

**CoinGecko API** (무료, API Key 불필요)

```
GET https://api.coingecko.com/api/v3/simple/price
  ?ids=bitcoin,ethereum
  &vs_currencies=usd,krw
  &include_24hr_change=true
  &include_market_cap=true
```

### 응답 예시

```json
{
  "bitcoin": {
    "usd": 66645,
    "krw": 98302614,
    "usd_24h_change": 0.19,
    "usd_market_cap": 1334108163262
  },
  "ethereum": {
    "usd": 1948.65,
    "krw": 2874277,
    "usd_24h_change": -0.63,
    "usd_market_cap": 235508695660
  }
}
```

> **참고**: CoinGecko 무료 플랜은 분당 10~30회 요청 제한이 있으며, 같은 네트워크(Wi-Fi)의 사용자들은 IP를 공유하므로 동시 사용 시 429 에러가 발생할 수 있습니다.

## 실행 방법

### crypto-prices.html (단일 파일)
브라우저에서 `crypto-prices.html` 파일을 열면 바로 동작합니다.

### crypto-price-app (Next.js)

```bash
cd crypto-price-app
npm install
npm run dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

## 기술 스택

- **crypto-prices.html**: HTML, Tailwind CSS (CDN), Vanilla JavaScript
- **crypto-price-app**: Next.js 15, React 19, TypeScript, Tailwind CSS

## 과제 정보

- 과목: Blockchain Lab #1
- 교수: 김형중 (국민대학교)
- 날짜: 2026.03.03
