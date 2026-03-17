# Blockchain Lab #3 — GIWA Sepolia 테스트넷 실습

GIWA Sepolia 테스트넷에서 nonce · gas · signature를 직접 코드로 확인하는 3주차 실습 프로젝트.

---

## 프로젝트 설명

### 수업 목표

이더리움의 핵심 개념 세 가지를 **실제 테스트넷에서 직접 관찰**한다.

| 개념 | 설명 | 코드에서 확인하는 것 |
|------|------|---------------------|
| **Nonce** | 트랜잭션 일련번호. 리플레이 공격 방지 | 송금 전후 nonce +1 증가 |
| **Gas** | EVM 연산 비용. 스팸 방지 + 검증자 보상 | 실제 수수료 = gasUsed × gasPrice |
| **Signature (r, s, v)** | ECDSA 서명. Private Key 소유 증명 | ecrecover로 서명자 주소 복원 |

### 3단계 실습 구성

```
1단계  →  잔액 + Nonce 확인   (01-check-balance.js)
2단계  →  ETH 실제 송금       (02-send-eth.js)
3단계  →  TX 추적 + 서명 검증  (03-track-tx.js, 04-verify-sig.js)
웹 UI  →  MetaMask 연결 인터페이스 (index.html + server.js)
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 런타임 | Node.js |
| 이더리움 라이브러리 | ethers.js v6 (`^6.16.0`) |
| 환경 변수 | dotenv (`^16.4.0`) |
| 웹 서버 | Node.js 내장 `http` 모듈 |
| 프론트엔드 CSS | Tailwind CSS CDN |
| 프론트엔드 이더리움 | ethers.js v6 UMD CDN |
| 테스트넷 | GIWA Sepolia (Chain ID: 91342, OP Stack L2) |
| RPC 제공자 | GIWA Sepolia RPC (`https://sepolia-rpc.giwa.io/`) |

---

## GIWA Sepolia 네트워크 특성

GIWA Sepolia는 **OP Stack 기반 L2 테스트넷**이다.

| 항목 | 값 |
|------|------|
| 체인 ID | 91342 |
| 블록 생성 시간 | ~1초 |
| 평균 수수료 | ~₩1 (매우 저렴) |
| RPC URL | `https://sepolia-rpc.giwa.io/` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Bridge | `https://sepolia-bridge.giwa.io` |

> **참고**: OP Stack L2이므로 이더리움 L1(Sepolia) 대비 블록 생성이 빠르고 수수료가 극히 저렴하다.

---

## 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env`를 만든다.

```bash
cp .env.example .env
```

`.env` 파일을 열고 값을 채운다:

```env
# 이더리움 지갑 개인키 (0x 없이 입력)
PRIVATE_KEY=your_private_key_here
```

> **주의**: `.env` 파일에 실제 개인키를 넣으면 절대 GitHub에 올리지 마세요.
> `.gitignore`에 `.env`가 포함되어 있는지 반드시 확인하세요.

### 3. Faucet에서 GIWA Sepolia ETH 받기

실습을 위해 소량의 GIWA Sepolia ETH가 필요하다.

- https://faucet.giwa.io/ (0.005 ETH / 24h)
- https://faucet.lambda256.io/giwa-sepolia (0.01 ETH / 24h)

### 4. 서버 시작

```bash
npm start
```

브라우저에서 http://localhost:5500 접속.

---

## 프로젝트 구조

```
week_3-sepolia-lab/
├── scripts/
│   ├── 01-check-balance.js   # 잔액 + nonce 확인
│   ├── 02-send-eth.js        # ETH 송금 (nonce/gas 관찰)
│   ├── 03-track-tx.js        # TX 추적 (서명 r,s,v 출력)
│   └── 04-verify-sig.js      # 서명 검증 (ecrecover)
├── index.html                # MetaMask 연결 웹 인터페이스
├── server.js                 # Node.js HTTP API 서버
├── package.json
├── .env.example              # 환경 변수 예시
├── .gitignore
├── README.md                 # 이 파일
├── CORE-CODE-EXPLANATION.md  # 핵심 코드 설명서
└── PRESENTATION-DEMO.md      # 발표 시나리오
```

---

## CLI 스크립트 사용법

### 01-check-balance.js — 잔액 + Nonce 확인

```bash
node scripts/01-check-balance.js
# 또는
npm run step1
```

`.env`의 `PRIVATE_KEY`로 지갑 주소를 파생한 뒤 GIWA Sepolia 잔액과 현재 nonce를 출력한다.

**출력 예시**
```
  [지갑 정보]
  주소     : 0xYourAddress...
  잔액     : 0.5 ETH
  현재 Nonce: 3
```

---

### 02-send-eth.js — ETH 송금

```bash
# 자기 자신에게 0.001 ETH 송금 (기본값)
node scripts/02-send-eth.js
npm run step2

# 특정 주소로 특정 금액 송금
node scripts/02-send-eth.js 0xRecipientAddress 0.005
```

| 인수 | 설명 | 기본값 |
|------|------|--------|
| `[받는주소]` | 수신자 이더리움 주소 | 자기 자신 |
| `[ETH수량]` | 송금할 ETH 양 | `0.001` |

송금 전후 nonce 변화, 실제 gas 수수료를 출력한다. 블록 포함 후 GIWA Explorer 링크도 제공한다.

---

### 03-track-tx.js — 트랜잭션 추적

```bash
node scripts/03-track-tx.js <트랜잭션_해시>
npm run step3 -- 0xabc123...
```

TX 해시로 트랜잭션 기본 정보, 서명(r, s, v), 영수증(gas 수수료)을 출력한다.

**출력 예시**
```
  [서명 정보 (Private Key 소유 증명)]
  r : 0x1234...  (32바이트)
  s : 0xabcd...  (32바이트)
  v : 27
```

---

### 04-verify-sig.js — 서명 검증 (ecrecover)

```bash
node scripts/04-verify-sig.js <트랜잭션_해시>
npm run step4 -- 0xabc123...
```

`02-send-eth.js`로 보낸 트랜잭션의 서명을 ecrecover로 검증한다.
복원된 주소가 `tx.from`과 일치하면 검증 성공.

**출력 예시**
```
  [검증 결과]
  원본 From  : 0xYourAddress...
  복원 주소  : 0xYourAddress...

  ✅ 서명 검증 성공!
  → Private Key를 공개하지 않고도 본인임을 증명 가능!
```

---

## API 엔드포인트

서버(`npm start`) 실행 후 `http://localhost:5500`에서 사용 가능하다.

| 메서드 | 경로 | 설명 | 파라미터 |
|--------|------|------|----------|
| `GET` | `/api/wallet-info` | 서버 지갑 주소, 잔액, nonce 반환 | 없음 (PRIVATE_KEY 필요) |
| `GET` | `/api/balance` | 임의 주소의 잔액, nonce 반환 | `?address=0x...` |
| `POST` | `/api/send-eth` | 서버 지갑에서 ETH 송금 | body: `{ "to": "0x...", "amount": "0.001" }` |
| `GET` | `/api/tx` | TX 해시로 트랜잭션 상세 조회 | `?hash=0x...` |
| `GET` | `/api/verify-sig` | 서명 검증 (ecrecover) | `?hash=0x...` |

### 응답 예시: GET /api/tx?hash=0x...

```json
{
  "hash": "0xabc123...",
  "from": "0xYourAddress...",
  "to": "0xRecipient...",
  "valueDisplay": "0.001 ETH",
  "nonce": 3,
  "gasLimit": "21000",
  "gasUsed": "21000",
  "gasPrice": "1.5 Gwei",
  "fee": "0.0000315 ETH",
  "status": "성공",
  "blockNumber": 7523419,
  "signature": {
    "r": "0x1234...",
    "s": "0xabcd...",
    "v": 27
  },
  "explorerLink": "https://sepolia-explorer.giwa.io/tx/0xabc123..."
}
```

### 응답 예시: GET /api/verify-sig?hash=0x...

```json
{
  "txHash": "0xabc123...",
  "originalFrom": "0xYourAddress...",
  "recoveredAddress": "0xYourAddress...",
  "isValid": true,
  "signature": { "r": "0x...", "s": "0x...", "v": 27 },
  "explanation": "두 주소가 일치합니다. tx.from 주소의 소유자가 이 트랜잭션에 서명했음이 수학적으로 증명됩니다."
}
```

---

## 핵심 개념 요약

### Nonce

```
getTransactionCount(address) → 현재 nonce
                              ↓
sendTransaction() 실행 → tx.nonce == 현재 nonce
                              ↓
블록 포함 후 → getTransactionCount(address) == nonce + 1
```

- 역할: 리플레이 공격 방지, 트랜잭션 순서 보장
- 자동 설정: `wallet.sendTransaction()`이 자동으로 nonce를 조회해서 채운다
- 비유: 은행 거래 일련번호

### Gas

```
수수료(ETH) = receipt.gasUsed × receipt.gasPrice
           = 21,000 gas × (네트워크 혼잡도에 따른 Gwei)
```

- `gasLimit`: 최대 사용 가능량 (단순 전송 = 21,000)
- `gasUsed`: 실제 사용량
- `gasPrice`: 단위당 가격 (Gwei)
- 수수료 수신자: 검증자(Validator)

### Signature (r, s, v)

```
개인키 + 트랜잭션 해시 → ECDSA → (r, s, v)
(r, s, v) + 트랜잭션 해시 → ecrecover → Public Key → 주소
복원된 주소 == tx.from → 서명 유효 ✅
```

- 개인키는 네트워크에 전송되지 않는다
- 서명만으로 서명자 주소를 수학적으로 역산 가능 (ecrecover)
- 비유: 위조 불가 도장

---

## CLI와 웹 UI의 차이

이 프로젝트는 같은 실습을 **두 가지 방법**으로 수행할 수 있다.

| 구분 | CLI (터미널) | 웹 UI (브라우저) |
|------|-------------|-----------------|
| 실행 방법 | `node scripts/01~04.js` | `npm start` 후 브라우저 접속 |
| 서명 방식 | `.env`의 PRIVATE_KEY로 직접 서명 | MetaMask 지갑으로 서명 |
| 지갑 주소 | PRIVATE_KEY에서 파생된 주소 | MetaMask에 연결된 주소 |
| 적합한 사람 | 코드 동작을 이해하고 싶은 학생 | 먼저 체험부터 하고 싶은 학생 |

> **주의**: CLI와 웹 UI에서 사용하는 지갑 주소가 **다를 수 있다**.
> `.env`에 넣은 개인키와 MetaMask에 등록된 계정이 같은 주소인지 확인하세요.
> 같은 주소를 사용하려면 MetaMask에서 개인키를 내보내서 `.env`에 설정하면 된다.
