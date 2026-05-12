# mKRW Cafe Pay on GIWA

**GIWA Sepolia**와 **Nodit RPC**를 활용한 스테이블코인 기반 카페 결제 DApp입니다.

이 프로젝트는 직접 만든 ERC-20 스테이블코인 `mKRW`를 발행하고, 해당 토큰으로 카페 결제를 수행할 수 있는 스마트컨트랙트와 프론트엔드를 구현한 과제입니다.

---

## 프로젝트 개요

`mKRW Cafe Pay on GIWA`는 사용자가 직접 만든 스테이블코인을 이용해 카페 결제를 수행하는 온체인 결제 DApp입니다.

사용자는 프론트엔드에서 MetaMask 지갑을 연결한 뒤, mKRW 잔액을 조회하고, 결제 컨트랙트에 토큰 사용 권한을 승인한 후 결제를 실행할 수 있습니다.

전체 흐름은 다음과 같습니다.

```txt
사용자 지갑
   ↓ approve
결제 컨트랙트에 mKRW 사용 권한 부여
   ↓ pay
mKRW 결제 실행
   ↓
수수료는 컨트랙트에 보관
   ↓
나머지 금액은 merchant 주소로 정산
```

---

## 주요 기능

### 1. 나만의 스테이블코인 `mKRW`

`MyKRWStableCoin` 컨트랙트는 카페 결제에 사용되는 ERC-20 기반 스테이블코인입니다.

| 항목 | 내용 |
|---|---|
| Token Name | My Korean Won Stable Coin |
| Symbol | mKRW |
| Decimals | 6 |
| Standard | ERC-20 |

주요 기능은 다음과 같습니다.

- owner가 minter 등록
- 등록된 minter만 mKRW 발행 가능
- ERC-20 표준 함수 지원
- `approve()`를 통한 결제 컨트랙트 사용 권한 부여
- `balanceOf()`를 통한 잔액 조회

---

### 2. 카페 결제 컨트랙트 `StableCafePayment`

`StableCafePayment` 컨트랙트는 mKRW를 이용해 카페 결제를 처리하는 스마트컨트랙트입니다.

주요 기능은 다음과 같습니다.

- 결제 가능한 토큰 화이트리스트 등록
- merchant 주소 관리
- 수수료율 설정
- `approve + pay` 방식의 ERC-20 결제
- 수수료 인출 기능

결제 예시는 다음과 같습니다.

```txt
결제 금액: 100 mKRW
수수료율: 1%

merchant 정산 금액: 99 mKRW
컨트랙트에 남는 수수료: 1 mKRW
```

---

### 3. 프론트엔드 DApp

프론트엔드는 사용자가 배포된 컨트랙트와 상호작용할 수 있도록 구성했습니다.

지원 기능은 다음과 같습니다.

- MetaMask 지갑 연결
- GIWA Sepolia 네트워크 추가
- Nodit API Key 입력
- StableCoin Contract 주소 입력
- Payment Contract 주소 입력
- mKRW 잔액 조회
- Approve 실행
- Pay Now 실행
- 트랜잭션 로그 확인

---

## 사용 기술

| 구분 | 기술 |
|---|---|
| Blockchain | GIWA Sepolia |
| RPC Provider | Nodit |
| Smart Contract | Solidity |
| Wallet | MetaMask |
| Deployment Tool | Remix IDE |
| Frontend | HTML, CSS, JavaScript |
| Web3 Library | ethers.js |

---

## 네트워크 정보

본 프로젝트는 **GIWA Sepolia 테스트넷**을 사용합니다.

| 항목 | 값 |
|---|---|
| Network Name | GIWA Sepolia |
| Chain ID | 91342 |
| Currency Symbol | ETH |
| RPC URL | `https://giwa-sepolia.nodit.io/YOUR_API_KEY` |
| Explorer | `https://sepolia-explorer.giwa.io` |

Nodit RPC URL을 사용할 때 API Key에 중괄호를 넣지 않습니다.

```txt
잘못된 예:
https://giwa-sepolia.nodit.io/{YOUR_API_KEY}

올바른 예:
https://giwa-sepolia.nodit.io/YOUR_API_KEY
```

---

## 프로젝트 구조

```txt
week_10_giwa_stablecoin_payment_dapp/
├── contracts/
│   ├── MyKRWStableCoin.sol
│   └── StableCafePayment.sol
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── screenshots/
│   ├── 1_before_payment.png 
│   └── 2_after_payment.png
└── README.md
```

---

## 컨트랙트 배포 방법

본 프로젝트의 컨트랙트는 **Remix IDE**에서 배포했습니다.

배포 시 가장 중요한 점은 Remix VM이 아니라 MetaMask를 통해 GIWA Sepolia에 연결해야 한다는 것입니다.

```txt
Environment:
Browser Extension - MetaMask

Network:
GIWA Sepolia
```

`Remix VM`으로 배포하면 Remix 내부 테스트 체인에만 배포되기 때문에, 프론트엔드에서 GIWA Sepolia 컨트랙트로 호출할 수 없습니다.

---

## 배포 순서

### 1. `MyKRWStableCoin` 배포

먼저 `MyKRWStableCoin.sol`을 배포합니다.

constructor 입력값:

```txt
initialOwner = 본인 지갑 주소
```

배포 후 생성된 주소는 프론트엔드의 `StableCoin Contract` 입력값으로 사용합니다.

```txt
StableCoin Contract = MyKRWStableCoin 배포 주소
```

---

### 2. Minter 등록

배포된 `MyKRWStableCoin` 컨트랙트에서 `addMinter()`를 실행합니다.

```txt
minter = 본인 지갑 주소
```

이 과정을 통해 해당 지갑이 mKRW를 발행할 수 있는 권한을 갖게 됩니다.

---

### 3. mKRW 발행

`mint()` 함수를 실행해 본인 지갑에 mKRW를 발행합니다.

예시:

```txt
to = 본인 지갑 주소
amount = 1000000000
```

mKRW는 decimals가 6이므로 다음과 같이 계산됩니다.

```txt
1000 mKRW = 1000 * 10^6 = 1000000000
```

---

### 4. `StableCafePayment` 배포

다음으로 `StableCafePayment.sol`을 배포합니다.

constructor 입력값:

```txt
initialOwner = 본인 지갑 주소
initialMerchant = merchant 지갑 주소
initialFeeRate = 100
```

`initialFeeRate = 100`은 수수료율 1%를 의미합니다.

```txt
100 / 10000 = 1%
```

배포 후 생성된 주소는 프론트엔드의 `Payment Contract` 입력값으로 사용합니다.

```txt
Payment Contract = StableCafePayment 배포 주소
```

---

### 5. 결제 토큰 등록

배포된 `StableCafePayment` 컨트랙트에서 `addWhitelistedToken()`을 실행합니다.

```txt
token = MyKRWStableCoin 배포 주소
```

이 과정을 통해 `StableCafePayment` 컨트랙트가 mKRW를 결제 가능한 토큰으로 인식하게 됩니다.

---

## 프론트엔드 실행 방법

VS Code Live Server를 사용하거나, 간단한 로컬 서버로 실행할 수 있습니다.

```bash
cd frontend
python -m http.server 5500
```

브라우저에서 아래 주소로 접속합니다.

```txt
http://localhost:5500
```

---

## 프론트엔드 사용 방법

### 1. 설정값 입력

프론트엔드의 설정 영역에 아래 값을 입력합니다.

```txt
Nodit API Key
StableCoin Contract 주소
Payment Contract 주소
```

입력 후 `설정 저장` 버튼을 누릅니다.

---

### 2. 지갑 연결

`지갑 연결` 버튼을 누르고 MetaMask 계정을 연결합니다.

프론트엔드는 연결된 지갑 주소를 기준으로 mKRW 잔액을 조회하고 트랜잭션을 실행합니다.

---

### 3. 잔액 조회

`잔액 새로고침` 버튼을 누르면 `MyKRWStableCoin` 컨트랙트의 `balanceOf()`를 호출해 현재 지갑의 mKRW 잔액을 표시합니다.

---

### 4. Approve 실행

결제 금액을 입력한 뒤 `Approve` 버튼을 누릅니다.

`Approve`는 결제 컨트랙트가 사용자의 mKRW를 사용할 수 있도록 허용하는 단계입니다.  
이 단계에서는 실제 잔액이 줄어들지 않습니다.

---

### 5. Pay Now 실행

`Pay Now` 버튼을 누르면 `StableCafePayment` 컨트랙트의 `pay()` 함수가 실행됩니다.

이때 mKRW가 실제로 이동하며, 결제 금액에서 수수료를 제외한 금액이 merchant 주소로 전송됩니다.

---

## 결제 예시

예를 들어 사용자가 `100 mKRW`를 결제하고 수수료율이 `1%`라면 다음과 같이 처리됩니다.

```txt
사용자 결제 금액: 100 mKRW
merchant 수령 금액: 99 mKRW
컨트랙트 보관 수수료: 1 mKRW
```

만약 merchant 주소를 결제자와 같은 지갑 주소로 설정했다면, 결제 후 지갑 잔액은 결제 금액 전체가 아니라 수수료만큼만 줄어듭니다.

```txt
결제 전: 1000 mKRW
결제 후: 999 mKRW
```

이는 사용자가 100 mKRW를 결제했지만, merchant 주소가 같은 지갑이기 때문에 99 mKRW가 다시 같은 지갑으로 돌아오기 때문입니다.

---

## 제출용 캡처 예시

과제 제출 시 아래와 같은 캡처를 함께 첨부했습니다.

| 파일명 | 설명 |
|---|---|
| `1_before_payment.png` | 결제 전 mKRW 잔액 |
| `2_after_payment.png` | Pay Now 실행 후 결제 완료 로그 및 잔액 변화 |

---

## 주의사항

### Approve만으로는 잔액이 줄어들지 않습니다

`Approve`는 토큰 사용 권한을 부여하는 과정입니다.  
실제 결제는 `Pay Now`를 실행해야 이루어집니다.

---

### MetaMask에서 0 ETH로 보여도 정상입니다

결제 과정에서 MetaMask가 `0 ETH` 전송으로 표시할 수 있습니다.

이는 ETH를 보내는 것이 아니라 스마트컨트랙트 함수를 호출하는 트랜잭션이기 때문입니다.  
실제 mKRW 이동은 컨트랙트 내부의 `transferFrom()`을 통해 처리됩니다.

---

### Remix VM 주소는 사용하면 안 됩니다

프론트엔드에 넣는 컨트랙트 주소는 반드시 GIWA Sepolia에 배포된 주소여야 합니다.

`Remix VM`에서 배포된 주소를 입력하면 프론트엔드가 GIWA Sepolia에서 해당 컨트랙트를 찾을 수 없습니다.

---

## 과제 조건 충족 여부

| 조건 | 구현 내용 |
|---|---|
| Nodit 사용 | Nodit API Key 기반 RPC 연결 |
| GIWA 체인 사용 | GIWA Sepolia 테스트넷 사용 |
| 나만의 스테이블코인 | `mKRW` ERC-20 토큰 구현 |
| 상호작용 컨트랙트 | `StableCafePayment` 결제 컨트랙트 구현 |
| 프론트엔드 DApp | 지갑 연결, 잔액 조회, approve, pay 기능 구현 |
| 제출용 캡처 | 결제 전후 화면 및 트랜잭션 로그 첨부 |

---

## 결과

이 프로젝트는 단순히 ERC-20 토큰을 만드는 데서 끝나지 않고, 해당 토큰을 실제 결제 컨트랙트와 연결해 DApp에서 사용할 수 있도록 구성했습니다.

최종적으로 사용자는 프론트엔드에서 지갑을 연결하고, mKRW 잔액을 확인한 뒤, 결제 컨트랙트를 통해 카페 결제를 실행할 수 있습니다.

```txt
mKRW Stablecoin
      ↓
Cafe Payment Contract
      ↓
Frontend DApp
      ↓
MetaMask
      ↓
GIWA Sepolia
```

이를 통해 **스테이블코인 발행, 컨트랙트 배포, 토큰 승인, 결제 실행, 프론트엔드 상호작용**까지 이어지는 전체 DApp 흐름을 구현했습니다.
