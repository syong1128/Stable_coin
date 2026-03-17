# Blockchain Lab #3 — 핵심 코드 설명서

> 이 문서는 `week_3-sepolia-lab`의 각 파일 핵심 코드를 **비유 + 정석 설명**으로 풀어놓은 설명서다.
> nonce / gas / signature 세 개념이 실제 코드 어디에 어떻게 나타나는지 추적한다.

---

## 목차

[전체 구조](#전체-구조) · [01-check-balance.js](#01-check-balancejs) · [02-send-eth.js](#02-send-ethjs) · [03-track-tx.js](#03-track-txjs) · [04-verify-sig.js](#04-verify-sigjs) · [server.js](#serverjs) · [index.html](#indexhtml) · [ethers.js v6 API 사전](#ethersjs-v6-api-사전) · [nonce / gas / signature 심층 분석](#nonce--gas--signature-심층-분석)

---

## 전체 구조

```
┌──────────────────── 사용자 브라우저 ────────────────────┐
│                                                          │
│   MetaMask(지갑)                                         │
│      ↕ window.ethereum / BrowserProvider                │
│   index.html                                             │
│      ↕ fetch('/api/...')                                │
└──────────────────────┬───────────────────────────────────┘
                        │ HTTP (localhost:5500)
              ┌─────────▼─────────┐
              │    server.js       │
              │  (Node.js HTTP)    │
              │                    │
              │  GET  /api/wallet-info   │
              │  GET  /api/balance       │
              │  POST /api/send-eth      │
              │  GET  /api/tx            │
              │  GET  /api/verify-sig    │
              │  *    정적 파일 서빙      │
              └──────────┬─────────┘
                          │ JsonRpcProvider
              ┌────────────▼────────────┐
              │   GIWA Sepolia RPC       │
              │   (GIWA Sepolia 테스트넷)│
              └─────────────────────────┘

  별도 CLI 스크립트 (브라우저 없이 직접 실행)
  ┌──────────────────────────────────────┐
  │  01-check-balance.js → 잔액/nonce    │
  │  02-send-eth.js      → ETH 송금      │
  │  03-track-tx.js      → TX 추적       │
  │  04-verify-sig.js    → 서명 검증     │
  └──────────────────────────────────────┘
```

> **비유 — 레스토랑**
> `index.html` = 홀(손님 자리). `server.js` = 주방(요리사). GIWA Sepolia RPC = 블록체인 창구.
> MetaMask = 손님의 지갑(서명 도구). CLI 스크립트 = 주방 직통 전화(콘솔 주문).

> **정석**
> 클라이언트-서버 아키텍처. 브라우저는 `fetch()`로 HTTP 요청 → 서버가 GIWA Sepolia JSON-RPC로 블록체인 조회 → JSON 응답 반환.
> MetaMask는 `window.ethereum`을 브라우저에 주입하여 지갑 서명을 담당한다.
> CLI 스크립트는 서버 없이 `JsonRpcProvider`로 GIWA RPC에 직접 연결한다.

---

## 01-check-balance.js

**역할**: GIWA Sepolia 잔액과 nonce를 콘솔에 출력한다. 실습 1단계.

### 핵심 코드 — Provider 생성 + 잔액/nonce 조회

```js
// GIWA Sepolia RPC 설정
var RPC_URL = 'https://sepolia-rpc.giwa.io/';

// GIWA Sepolia 테스트넷에 연결
var provider = new ethers.JsonRpcProvider(RPC_URL);

// Wallet 객체 생성 (주소 추출용)
var wallet = new ethers.Wallet(privateKey, provider);
var address = wallet.address;

// 잔액 조회 (단위: wei → ETH 변환)
var balanceWei = await provider.getBalance(address);
var balanceEth = ethers.formatEther(balanceWei);

// 현재 nonce 조회 (트랜잭션 카운트 = 지금까지 보낸 tx 수)
var nonce = await provider.getTransactionCount(address);
```

**포인트**
- `JsonRpcProvider(url)` → 블록체인 읽기 전용 연결. 서버 또는 CLI 양쪽에서 동일하게 사용한다.
- `getBalance(address)` → `BigInt` (wei 단위) 반환. `formatEther()`로 사람이 읽을 수 있는 ETH 문자열로 변환.
- `getTransactionCount(address)` → 해당 주소가 지금까지 성공적으로 보낸 트랜잭션 수 = **현재 nonce**.

> **비유** — `getBalance`는 통장 잔액 조회, `getTransactionCount`는 은행 거래 횟수 조회.

> **정석** — 이더리움의 모든 금액은 wei(정수)로 저장된다. `1 ETH = 10^18 wei`. `formatEther()`는 단순히 `BigInt / 10^18`을 문자열로 변환한다. 소수점 오류를 방지하기 위해 모든 내부 연산은 정수(BigInt)로 처리된다.

---

## 02-send-eth.js

**역할**: GIWA Sepolia ETH를 실제로 송금하고 nonce/gas 변화를 관찰한다. 실습 2단계.

### 핵심 코드 — 트랜잭션 전송과 영수증 대기

```js
// GIWA Sepolia 테스트넷 연결 + Wallet 생성
var provider = new ethers.JsonRpcProvider(RPC_URL);
var wallet = new ethers.Wallet(privateKey, provider);

// 송금 전 nonce 조회
var nonceBefore = await provider.getTransactionCount(myAddress);

// 트랜잭션 전송
var tx = await wallet.sendTransaction({
  to: toAddress,
  value: ethers.parseEther(amount),
});

console.log('  Tx Hash   :', tx.hash);
console.log('  Nonce     :', tx.nonce, '← 예상 Nonce와 일치 확인!');
console.log('  Gas Limit :', tx.gasLimit.toString());

// 블록에 포함될 때까지 대기
var receipt = await tx.wait();

// 실제 수수료 계산 (BigInt 연산)
var gasUsed = receipt.gasUsed;
var gasPrice = receipt.gasPrice;
var feeWei = gasUsed * gasPrice;
var feeEth = ethers.formatEther(feeWei);
var gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
```

### 핵심 코드 — 주소 유효성 검사

```js
try {
  toAddress = ethers.getAddress(toAddress);
} catch (e) {
  console.log('  ❌ 잘못된 이더리움 주소:', toAddress);
  process.exit(1);
}
```

**포인트**
- `wallet.sendTransaction({ to, value })` → ethers.js가 nonce/gasLimit/chainId를 자동으로 채워서 서명 후 브로드캐스트.
- `tx.wait()` → 트랜잭션이 블록에 포함될 때까지 폴링 대기. `TransactionReceipt`를 반환한다.
- `receipt.gasUsed * receipt.gasPrice` → BigInt 곱셈으로 실제 수수료(wei)를 계산. JS `*` 연산자가 BigInt 간에도 동작한다.
- `ethers.getAddress(addr)` → EIP-55 체크섬 주소로 정규화 + 유효성 검사. 잘못된 주소면 예외 발생.

> **비유** — `sendTransaction()`은 은행 창구에 "이 금액을 저 계좌로 이체해줘"라고 맡기는 것.
> `tx.wait()`은 "이체 완료" 문자가 올 때까지 기다리는 것.

> **정석** — `sendTransaction`은 내부적으로 ① nonce 조회 → ② gas 추정 → ③ ECDSA 서명 → ④ `eth_sendRawTransaction` 브로드캐스트 순서로 진행된다. `tx.wait()`은 `eth_getTransactionReceipt`를 폴링하여 영수증이 생길 때까지 대기한다.

---

## 03-track-tx.js

**역할**: TX 해시로 트랜잭션 데이터와 서명(r, s, v)을 조회한다. 실습 3단계.

### 핵심 코드 — TX 조회와 영수증 조회

```js
var provider = new ethers.JsonRpcProvider(RPC_URL);

// 트랜잭션 데이터 조회 (미포함/포함 모두 가능)
var tx = await provider.getTransaction(txHash);

// 영수증 조회 (블록에 포함된 경우에만 존재)
var receipt = await provider.getTransactionReceipt(txHash);
```

### 핵심 코드 — 서명 정보 접근

```js
// 서명 정보 (r, s, v) 출력
console.log('  [서명 정보 (Private Key 소유 증명)]');
console.log('  r :', tx.signature ? tx.signature.r : 'N/A');
console.log('  s :', tx.signature ? tx.signature.s : 'N/A');
console.log('  v :', tx.signature ? tx.signature.v : 'N/A');
```

### 핵심 코드 — 수수료 계산

```js
if (receipt) {
  var gasUsed = receipt.gasUsed;
  var gasPrice = receipt.gasPrice;
  var feeWei = gasUsed * gasPrice;
  var feeEth = ethers.formatEther(feeWei);
  var gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
}
```

**포인트**
- `getTransaction(hash)` → 블록 포함 여부와 무관하게 트랜잭션 데이터(`TransactionResponse`) 반환.
- `getTransactionReceipt(hash)` → 블록에 포함된 경우에만 `TransactionReceipt` 반환. 미포함(pending)이면 `null`.
- `tx.signature.r`, `tx.signature.s`, `tx.signature.v` → ethers.js v6의 `Signature` 객체에서 접근. r/s는 64자리 16진수, v는 복원 파라미터.

> **비유** — `getTransaction()`은 택배 조회(발송 직후), `getTransactionReceipt()`는 배달 완료 확인서(수령 후).

> **정석** — `TransactionResponse`와 `TransactionReceipt`는 다른 객체다. Response는 트랜잭션이 브로드캐스트된 시점의 정보, Receipt는 블록에 포함된 후의 최종 실행 결과(gasUsed, status, logs 등)를 담는다.

---

## 04-verify-sig.js

**역할**: Transaction 재구성 + ecrecover로 서명자를 수학적으로 복원하여 검증한다. 보너스 실습.

### 핵심 코드 — Transaction 재구성 + ecrecover

```js
// ethers.js v6: TransactionResponse → Transaction으로 변환
// provider.getTransaction()은 TransactionResponse를 반환하며
// serialized 속성이 없으므로 직접 Transaction 객체를 재구성한다
var rawTx = new ethers.Transaction();
rawTx.type = tx.type;
rawTx.to = tx.to;
rawTx.nonce = tx.nonce;
rawTx.gasLimit = tx.gasLimit;
rawTx.data = tx.data;
rawTx.value = tx.value;
rawTx.chainId = tx.chainId;
rawTx.signature = tx.signature;

// EIP-1559 트랜잭션이면 maxFeePerGas/maxPriorityFeePerGas 설정
if (tx.maxFeePerGas) rawTx.maxFeePerGas = tx.maxFeePerGas;
if (tx.maxPriorityFeePerGas) rawTx.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
if (tx.gasPrice && !tx.maxFeePerGas) rawTx.gasPrice = tx.gasPrice;

// .from 접근 시 내부적으로 ecrecover 수행 (서명자 주소 복원)
recoveredAddress = rawTx.from;
```

### 핵심 코드 — 주소 비교 (검증 결과)

```js
var originalAddress = tx.from.toLowerCase();
var recoveredLower = recoveredAddress ? recoveredAddress.toLowerCase() : '';

if (recoveredAddress && originalAddress === recoveredLower) {
  console.log('  ✅ 서명 검증 성공!');
  console.log('  → 이것이 "서명이 유효하다는 수학적 증명"입니다.');
  console.log('  → tx.from 주소의 소유자가 이 트랜잭션에 서명했음이 확인됨');
  console.log('  → Private Key를 공개하지 않고도 본인임을 증명 가능!');
}
```

**포인트**
- ethers.js v6에서 `provider.getTransaction()`은 `TransactionResponse`를 반환하는데, 이는 `serialized` 속성이 없어 직접 ecrecover를 호출할 수 없다.
- `new ethers.Transaction()`으로 직접 Transaction 객체를 재구성하면 `.from` 접근 시 내부적으로 ecrecover가 실행된다.
- EIP-1559 트랜잭션(타입 2)은 `maxFeePerGas` / `maxPriorityFeePerGas`를 반드시 설정해야 한다. 레거시(타입 0)는 `gasPrice`를 사용한다.

> **비유** — ecrecover는 "봉인된 편지의 도장 자국"만 보고 누가 찍었는지 역산하는 것. Private Key 없이도 서명자를 특정할 수 있다.

> **정석** — ecrecover는 ECDSA 서명 복원 알고리즘이다. 트랜잭션 해시 + (r, s, v) → 타원곡선 연산 → Public Key 복원 → keccak256 해시 → 마지막 20바이트 = 이더리움 주소. v(복원 파라미터)가 0/1 중 어느 곡선 점인지를 결정한다.

---

## server.js

**역할**: Node.js 내장 `http` 모듈 기반 API 서버. CLI 스크립트와 동일한 ethers.js 로직을 HTTP API로 노출한다.

### 핵심 코드 — HTTP 라우팅 패턴

```js
var server = http.createServer(function (req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  var urlPath = req.url.split('?')[0];

  // API 라우트: /api/wallet-info
  if (urlPath === '/api/wallet-info' && req.method === 'GET') {
    handleWalletInfo(req, res).catch(function (err) {
      jsonResponse(res, 502, { error: err.message });
    });
    return;
  }

  // API 라우트: /api/send-eth (POST)
  if (urlPath === '/api/send-eth' && req.method === 'POST') {
    handleSendEth(req, res).catch(function (err) {
      jsonResponse(res, 502, { error: err.message });
    });
    return;
  }

  // 그 외: 정적 파일 서빙
  serveStaticFile(req, res);
});
```

### 핵심 코드 — JSON 응답 헬퍼 + POST body 파싱

```js
// JSON 응답 전송 헬퍼
function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// POST 요청 본문(body)을 JSON으로 파싱하는 헬퍼
function parseBody(req, callback) {
  var body = '';
  req.on('data', function (chunk) { body += chunk; });
  req.on('end', function () {
    try { callback(null, JSON.parse(body)); }
    catch (e) { callback(new Error('잘못된 JSON 형식')); }
  });
}
```

### 핵심 코드 — 서명 검증 API 핸들러

```js
async function handleVerifySig(req, res) {
  var urlObj = new URL(req.url, 'http://localhost');
  var txHash = urlObj.searchParams.get('hash');

  var tx = await provider.getTransaction(txHash);

  // ethers.js v6: TransactionResponse → Transaction으로 직접 재구성
  var rawTx = new ethers.Transaction();
  rawTx.type = tx.type;
  // ... (필드 복사)
  rawTx.signature = tx.signature;

  // .from 접근 시 내부적으로 ecrecover 수행 (서명자 주소 복원)
  recoveredAddress = rawTx.from;

  var isValid = !!(recoveredAddress && tx.from.toLowerCase() === recoveredAddress.toLowerCase());

  jsonResponse(res, 200, {
    txHash: tx.hash,
    originalFrom: tx.from,
    recoveredAddress: recoveredAddress || '복원 실패',
    isValid: isValid,
    signature: { r: tx.signature.r, s: tx.signature.s, v: tx.signature.v },
    explanation: isValid
      ? '두 주소가 일치합니다. tx.from 주소의 소유자가 이 트랜잭션에 서명했음이 수학적으로 증명됩니다.'
      : '주소 불일치 또는 복원 실패.',
  });
}
```

**포인트**
- URL 경로 + HTTP 메서드 조합으로 라우팅을 구현한다. Express 없이 `if`문으로 처리.
- `req.url.split('?')[0]` → 쿼리스트링을 제거한 순수 경로 추출.
- `new URL(req.url, 'http://localhost')` → URL 객체로 파싱하여 `searchParams.get(key)`로 쿼리 파라미터 추출.
- HTTP 응답 본문은 스트림(`data` 이벤트)으로 수신 → `end` 이벤트에서 JSON 파싱. 에러 우선 콜백 패턴.
- `handleXxx().catch(...)` → async 함수 예외를 502로 처리하는 일관된 에러 처리 패턴.

> **비유** — `urlPath`로 분기하는 `if`문 체인은 레스토랑의 주문표(메뉴판). 각 핸들러는 담당 요리사.

> **정석** — Node.js `http` 모듈은 단일 콜백으로 모든 요청을 받는다. Express 같은 라우터 없이 `if/else`로 직접 구현하면 동작 원리를 명확히 이해할 수 있다. POST body는 TCP 스트림으로 청크(chunk) 단위로 수신되므로 `end` 이벤트를 기다려야 완전한 body를 얻는다.

---

## index.html

**역할**: MetaMask(BrowserProvider)로 직접 GIWA Sepolia에 접근하는 웹 인터페이스.

### 핵심 코드 — MetaMask BrowserProvider 초기화

```js
var walletProvider = null;   // ethers.BrowserProvider
var walletSigner   = null;
var walletAddress  = '';
var GIWA_CHAIN_ID = 91342;

// 계정 요청
var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
walletAddress = accounts[0];

// Provider + Signer 초기화
walletProvider = new ethers.BrowserProvider(window.ethereum);
walletSigner   = await walletProvider.getSigner();
```

### 핵심 코드 — MetaMask를 통한 sendTransaction

```js
// MetaMask를 통한 송금
var tx = await walletSigner.sendTransaction({
  to: toAddr,
  value: ethers.parseEther(amount),
});

// 영수증 대기
var receipt = await tx.wait();

// 수수료 계산
var gasUsed  = receipt.gasUsed;
var gasPrice = receipt.gasPrice;
var feeEth   = ethers.formatEther(gasUsed * gasPrice);
```

### 핵심 코드 — GIWA Sepolia 네트워크 전환 요청

```js
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x164CE' }],  // 91342를 16진수로
});
```

### 핵심 코드 — 계정/네트워크 변경 이벤트 감지

```js
window.ethereum.on('accountsChanged', async function(accounts) {
  if (accounts.length === 0) {
    // 연결 해제 처리
    walletProvider = null;
    walletSigner   = null;
    walletAddress  = '';
  } else {
    walletAddress  = accounts[0];
    walletProvider = new ethers.BrowserProvider(window.ethereum);
    walletSigner   = await walletProvider.getSigner();
    await refreshWalletInfo();
  }
});

window.ethereum.on('chainChanged', function(chainIdHex) {
  var chainId = parseInt(chainIdHex, 16);
  if (chainId !== GIWA_CHAIN_ID) {
    alert('GIWA Sepolia 테스트넷으로 변경해주세요. (chainId: 91342)');
  }
});
```

**포인트**
- `BrowserProvider(window.ethereum)` → MetaMask를 ethers.js Provider로 감싼다. `JsonRpcProvider`와 달리 서명을 MetaMask에 위임한다.
- `getSigner()` → MetaMask에 서명을 위임하는 Signer 객체 반환. **개인키가 DApp 코드에 노출되지 않는다** (핵심 보안 설계).
- `wallet_switchEthereumChain` → MetaMask에 네트워크 전환 요청. `0x164CE` = 91342 (GIWA Sepolia Chain ID).
- `accountsChanged` / `chainChanged` 이벤트 → MetaMask가 상태 변화를 DApp에 push 방식으로 알린다.

> **비유** — `BrowserProvider`는 MetaMask를 통역사로 쓰는 것. 서버(server.js)의 `JsonRpcProvider`는 GIWA RPC에 직접 전화하는 것.

> **정석** — `BrowserProvider`와 `JsonRpcProvider`의 핵심 차이: Provider 타입 / 서명 주체 / 개인키 위치가 다르다.

| | BrowserProvider | JsonRpcProvider |
|---|---|---|
| 연결 대상 | window.ethereum (MetaMask) | GIWA Sepolia RPC URL |
| 서명 주체 | MetaMask (사용자 승인) | Wallet (서버 개인키) |
| 개인키 위치 | MetaMask 내부 | .env 파일 |
| 사용 위치 | 브라우저 | 서버/CLI |

---

## ethers.js v6 API 사전

| API | 반환 타입 | 설명 | 예시 |
|-----|-----------|------|------|
| `new ethers.JsonRpcProvider(url)` | `Provider` | RPC URL로 블록체인 연결 | `new ethers.JsonRpcProvider('https://sepolia-rpc.giwa.io/')` |
| `new ethers.BrowserProvider(window.ethereum)` | `BrowserProvider` | MetaMask 래퍼 Provider | `new ethers.BrowserProvider(window.ethereum)` |
| `new ethers.Wallet(privateKey, provider)` | `Wallet` | 개인키 + Provider = 서명 가능 Wallet | `new ethers.Wallet(process.env.PRIVATE_KEY, provider)` |
| `provider.getBalance(address)` | `BigInt` | 주소 잔액 (wei 단위) | `await provider.getBalance('0x...')` |
| `provider.getTransactionCount(address)` | `number` | 현재 nonce (보낸 TX 수) | `await provider.getTransactionCount(wallet.address)` |
| `provider.getTransaction(hash)` | `TransactionResponse \| null` | TX 해시로 트랜잭션 조회 | `await provider.getTransaction('0x...')` |
| `provider.getTransactionReceipt(hash)` | `TransactionReceipt \| null` | TX 영수증 (블록 포함 후) | `await provider.getTransactionReceipt('0x...')` |
| `wallet.sendTransaction({ to, value })` | `TransactionResponse` | 트랜잭션 전송 | `await wallet.sendTransaction({ to: '0x...', value: parseEther('0.001') })` |
| `tx.wait()` | `TransactionReceipt` | 블록 포함까지 대기 | `await tx.wait()` |
| `ethers.formatEther(wei)` | `string` | Wei → ETH 문자열 변환 | `ethers.formatEther(1000000000000000000n)` → `"1.0"` |
| `ethers.parseEther(eth)` | `BigInt` | ETH 문자열 → Wei BigInt | `ethers.parseEther('0.001')` → `1000000000000000n` |
| `ethers.formatUnits(value, unit)` | `string` | 임의 단위 변환 | `ethers.formatUnits(gasPrice, 'gwei')` |
| `ethers.getAddress(addr)` | `string` | EIP-55 체크섬 주소 정규화 + 유효성 검사 | `ethers.getAddress('0xabc...')` |
| `new ethers.Transaction()` | `Transaction` | 서명 가능한 TX 객체 직접 생성 | `rawTx.from` → 내부적으로 ecrecover 실행 |
| `provider.getSigner()` | `Signer` | MetaMask 서명 위임 객체 | `await browserProvider.getSigner()` |

---

## nonce / gas / signature 심층 분석

### nonce — 코드에서 어디에 나타나는가

**01-check-balance.js**
```js
// 현재 nonce 조회 (트랜잭션 카운트 = 지금까지 보낸 tx 수)
var nonce = await provider.getTransactionCount(address);
console.log('  현재 Nonce:', nonce);
console.log('  → 다음 tx는 Nonce', nonce, '로 발행됨');
```

**02-send-eth.js**
```js
// 송금 전 nonce
var nonceBefore = await provider.getTransactionCount(myAddress);
// sendTransaction 후 tx 객체에서 확인
console.log('  Nonce     :', tx.nonce, '← 예상 Nonce와 일치 확인!');
// 송금 후 nonce (1 증가 확인)
var nonceAfter = await provider.getTransactionCount(myAddress);
console.log('  현재 Nonce:', nonceAfter, '← Nonce가', nonceBefore, '→', nonceAfter, '로 +1 증가!');
```

**03-track-tx.js**
```js
console.log('  Nonce     :', tx.nonce);
console.log('  1. Nonce =', tx.nonce);
console.log('     → "이 트랜잭션이 몇 번째인지 (중복 방지)"');
```

> **비유** — 은행 거래 일련번호. 0번부터 시작해서 TX를 보낼 때마다 1씩 증가한다. 같은 번호의 수표는 한 번만 결제된다.

> **정석** — nonce는 계정 단위 카운터다. 이더리움 노드는 nonce가 현재 카운터와 정확히 일치할 때만 트랜잭션을 처리한다. 이로써 ① 동일 트랜잭션 재전송(리플레이 공격) 방지 ② 트랜잭션 처리 순서 보장이 달성된다. `ethers.js`의 `wallet.sendTransaction()`은 `provider.getTransactionCount()`로 nonce를 자동으로 가져와 채운다.

---

### gas — 코드에서 어디에 나타나는가

**02-send-eth.js**
```js
// sendTransaction 직후 gasLimit 확인
console.log('  Gas Limit :', tx.gasLimit.toString());

// 영수증에서 실제 사용량 + 가격 확인
var gasUsed = receipt.gasUsed;
var gasPrice = receipt.gasPrice;
var feeWei = gasUsed * gasPrice;
var feeEth = ethers.formatEther(feeWei);
var gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');

console.log('  Gas Used  :', gasUsed.toString(), '(실제 사용량)');
console.log('  Gas Price :', gasPriceGwei, 'Gwei');
console.log('  실제 수수료:', feeEth, 'ETH  ←  이게 실제로 차감된 gas 비용!');
```

| 개념 | 타입 | 위치 | 설명 |
|------|------|------|------|
| `gasLimit` | `BigInt` | `tx.gasLimit` | 최대 사용 가능 gas. 단순 ETH 전송은 항상 21,000. |
| `gasUsed` | `BigInt` | `receipt.gasUsed` | 실제 사용된 gas. |
| `gasPrice` | `BigInt` | `receipt.gasPrice` | gas 1단위당 가격 (wei). Gwei 단위로 표시한다. |
| 수수료 | `BigInt` | 계산값 | `gasUsed * gasPrice` = 실제 차감 금액 (wei). |

> **비유** — gasLimit = 연료 탱크 용량. gasUsed = 실제 소비된 연료. gasPrice = 주유 단가.
> 수수료 = 실제 소비 연료 × 단가.

> **정석** — Gas는 EVM(이더리움 가상 머신)의 연산 비용 단위다. 단순 ETH 전송은 항상 21,000 gas(고정). 스마트 컨트랙트 실행은 연산 복잡도에 따라 수십만~수백만 gas가 소모된다. Gas Price는 네트워크 혼잡도에 따라 변동하며, 높을수록 검증자가 우선 처리한다. EIP-1559(타입 2 TX) 이후에는 `baseFee + priorityFee` 구조로 변경되었다.
>
> **OP Stack L2 Gas 구조** — GIWA Sepolia는 OP Stack 기반 L2 네트워크이므로 Gas 수수료가 두 부분으로 구성된다: **L2 실행 수수료**(L2에서 트랜잭션을 실행하는 비용)와 **L1 데이터 수수료**(트랜잭션 데이터를 L1에 기록하는 비용). 총 수수료 = L2 execution fee + L1 data fee. L1 data fee는 L1의 gas 가격에 따라 변동하며, 일반적으로 L2 실행 수수료보다 비중이 크다.

---

### signature (r, s, v) — 코드에서 어디에 나타나는가

**03-track-tx.js**
```js
// 서명 정보 접근
console.log('  r :', tx.signature ? tx.signature.r : 'N/A');
console.log('  s :', tx.signature ? tx.signature.s : 'N/A');
console.log('  v :', tx.signature ? tx.signature.v : 'N/A');

console.log('  3. Signature (r, s, v)');
console.log('     → "Private Key로 서명 = 내가 보냈다는 증명"');
console.log('     → r, s: 서명값 (타원 곡선 수학으로 생성)');
console.log('     → v: 복원 파라미터 (서명자 주소를 역산하는 데 사용)');
```

**04-verify-sig.js**
```js
// ecrecover 실행 (rawTx.from 접근)
recoveredAddress = rawTx.from;

// 검증: 복원 주소 == 원본 From 주소
if (recoveredAddress && originalAddress === recoveredLower) {
  console.log('  ✅ 서명 검증 성공!');
  console.log('  → Private Key를 공개하지 않고도 본인임을 증명 가능!');
}
```

| 값 | 크기 | 의미 |
|----|------|------|
| `r` | 32바이트 (64자리 16진수) | 서명 계산 중간값 (타원곡선 점의 x좌표) |
| `s` | 32바이트 (64자리 16진수) | 서명 계산 중간값 (스칼라 값) |
| `v` | 1바이트 | 복원 파라미터. 0 또는 1 (어느 곡선 점인지) |

> **비유** — 서명은 "위조 불가 도장". r, s는 도장 무늬이고, v는 도장 방향. ecrecover는 "이 도장 자국이 누구 것인지"를 수학적으로 역추적하는 것.

> **정석** — ECDSA(타원곡선 디지털 서명 알고리즘)의 secp256k1 곡선을 사용한다.
> 서명 생성: `트랜잭션 데이터 → Keccak-256 해시 → Private Key로 ECDSA 서명 → (r, s, v)`.
> 서명 검증(ecrecover): `(r, s, v) + 해시 → 타원곡선 역산 → Public Key 복원 → keccak256 → 주소`.
> 핵심: Private Key는 네트워크에 전혀 전송되지 않는다. 검증자는 서명값만으로 서명자의 주소를 복원할 수 있다.

```
트랜잭션 데이터
      │
      ▼ keccak256 해시
  메시지 해시
      │
      ▼ secp256k1 ECDSA (Private Key 사용)
  서명 (r, s, v)     ──┐
                        │ ecrecover
                        ▼
                   Public Key 복원
                        │ keccak256 + 마지막 20바이트
                        ▼
                   이더리움 주소
                        │ 비교
                        ▼
                   == tx.from ? ✅ 검증 성공
```
