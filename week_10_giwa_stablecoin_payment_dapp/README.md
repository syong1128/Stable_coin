# 스테이블 코인 결제 DApp 만들기

## 1. 과제 개요

이 프로젝트는 **Nodit RPC**와 **GIWA Sepolia 체인**을 사용하여 직접 만든 스테이블코인과 결제 컨트랙트를 배포하고, 브라우저 DApp에서 상호작용하는 과제입니다.

구성은 다음과 같습니다.

1. `MyKRWStableCoin.sol`  
   - 나만의 원화형 스테이블코인 `mKRW`
   - ERC-20 기반
   - 6 decimals
   - Minter 권한 기반 발행
   - Pause 기능
   - Blacklist 기능
   - EIP-2612 Permit
   - ERC-3009 방식의 `transferWithAuthorization`

2. `StableCafePayment.sol`  
   - 카페 결제 컨트랙트
   - 화이트리스트에 등록된 토큰만 결제 가능
   - `approve + pay` 방식 지원
   - ERC-3009 서명 결제용 `payWithAuthorization` 지원
   - 수수료는 컨트랙트에 남고, 나머지는 merchant에게 전송

3. `frontend/`  
   - MetaMask 연결
   - GIWA Sepolia 네트워크 추가
   - Nodit API Key 기반 RPC URL 입력
   - mKRW 잔액 조회
   - approve 후 pay 실행

---

## 2. 사용 체인 정보

- Chain Name: `GIWA Sepolia`
- Chain ID: `91342`
- Currency Symbol: `ETH`
- 공식 공개 RPC: `https://sepolia-rpc.giwa.io`
- Nodit RPC URL: `https://giwa-sepolia.nodit.io/YOUR_API_KEY`
- Explorer: `https://sepolia-explorer.giwa.io`

주의할 점은 Nodit URL에 API Key를 넣을 때 `{}` 중괄호를 넣지 않는 것입니다.

예를 들어 API Key가 `abc123`이면 다음처럼 씁니다.

```txt
https://giwa-sepolia.nodit.io/abc123
```

---

## 3. 설치

```bash
npm install
```

---

## 4. 환경변수 설정

`.env.example` 파일을 복사해서 `.env`를 만듭니다.

```bash
cp .env.example .env
```

그리고 `.env`를 아래처럼 수정합니다.

```env
NODIT_API_KEY=본인의_Nodit_API_Key
PRIVATE_KEY=0x본인의_배포지갑_Private_Key
MERCHANT_ADDRESS=0x가맹점_주소
```

`PRIVATE_KEY`는 절대 GitHub에 올리면 안 됩니다.

---

## 5. 컴파일

```bash
npm run compile
```

---

## 6. 테스트

```bash
npm test
```

테스트는 로컬 Hardhat 네트워크에서 다음 흐름을 검증합니다.

1. mKRW 발행
2. customer에게 토큰 지급
3. customer가 결제 컨트랙트에 approve
4. `pay()` 실행
5. 1% 수수료는 결제 컨트랙트에 남고, 99%는 merchant에게 전송

---

## 7. GIWA Sepolia 배포

```bash
npm run deploy:giwa
```

배포가 성공하면 터미널에 다음 두 주소가 출력됩니다.

```txt
STABLECOIN_ADDRESS=0x...
PAYMENT_ADDRESS=0x...
```

이 주소를 프론트엔드 입력창에 넣으면 됩니다.

---

## 8. 프론트엔드 실행

가장 간단한 방법은 VS Code Live Server를 사용하는 것입니다.

```txt
frontend/index.html
```

파일을 열고 Live Server로 실행합니다.

또는 Python 서버를 사용할 수 있습니다.

```bash
cd frontend
python3 -m http.server 5500
```

브라우저에서 접속합니다.

```txt
http://localhost:5500
```

---

## 9. DApp 사용 순서

1. Nodit API Key 입력
2. StableCoin 주소 입력
3. Payment Contract 주소 입력
4. 설정 저장
5. GIWA 네트워크 추가
6. 지갑 연결
7. 잔액 조회
8. 결제 금액 입력
9. Approve
10. Pay

---

## 10. 컨트랙트 흐름 설명

사용자는 먼저 `MyKRWStableCoin`을 배포합니다. 이 토큰은 `mKRW`라는 이름의 원화형 스테이블코인입니다. 배포자는 owner가 되고, owner는 특정 주소를 minter로 등록할 수 있습니다. 등록된 minter만 정해진 한도 안에서 토큰을 발행할 수 있습니다.

이후 `StableCafePayment`를 배포합니다. 이 컨트랙트는 카페 결제 시스템 역할을 합니다. owner는 결제 가능한 토큰을 화이트리스트에 등록하고, merchant 주소와 수수료율을 관리합니다.

결제자는 `approve()`로 결제 컨트랙트에 mKRW 사용 권한을 준 뒤 `pay()`를 호출합니다. 결제 컨트랙트는 결제 금액 전체를 먼저 받은 뒤, 수수료를 제외한 금액을 merchant에게 보냅니다. 수수료는 컨트랙트에 남아 있다가 owner가 `withdrawFees()`로 인출할 수 있습니다.

또한 토큰 컨트랙트에는 ERC-3009 방식의 `transferWithAuthorization()`을 넣어 두었습니다. 이 방식은 사용자가 매번 `approve()`를 먼저 보내지 않아도, 오프체인 서명을 통해 결제를 실행할 수 있도록 하기 위한 구조입니다.

---

## 11. 제출 시 강조할 점

이 과제는 단순히 ERC-20 토큰 하나만 만든 것이 아니라, 실제 결제 서비스 구조를 흉내 내도록 설계했습니다.

- Nodit RPC를 통해 GIWA Sepolia에 연결
- 직접 만든 mKRW 스테이블코인 배포
- 결제 컨트랙트와 상호작용
- 화이트리스트 기반 결제 토큰 제한
- merchant와 franchise owner 역할 분리
- 수수료 계산 및 인출 구조 구현
- approve 방식과 서명 기반 결제 구조 모두 고려

따라서 “스테이블코인 + 결제 DApp + 체인 배포 + 프론트 상호작용” 조건을 모두 만족합니다.


---

## 12. 프론트엔드 화면 구성

프론트엔드는 단순 테스트 화면이 아니라 제출용 DApp 화면처럼 보이도록 구성했습니다.

- 상단 네비게이션: 서비스명, GIWA 네트워크 추가, 지갑 연결
- 히어로 영역: 프로젝트 설명, Chain ID, 토큰 심볼, 수수료 정보
- 결제 미리보기 카드: 결제 금액, merchant 정산 금액, 수수료 표시
- 설정 패널: Nodit API Key, StableCoin 주소, Payment 주소 저장
- 지갑 패널: 연결 주소와 mKRW 잔액 조회
- 결제 패널: approve 후 pay 실행
- 로그 패널: 트랜잭션 진행 상태 표시

이 화면을 통해 과제의 핵심인 “GIWA 체인 위에서 mKRW 스테이블코인으로 결제하는 흐름”을 시각적으로 보여줄 수 있습니다.


---

## 프론트엔드 디자인 업데이트

프론트엔드는 제출 화면에서 더 깔끔하게 보이도록 밝은 핀테크 대시보드 스타일로 정리했습니다.

- 큰 히어로 문구를 줄이고 설명 중심으로 변경
- 결제 미리보기 카드 추가
- 설정, 지갑, 결제, 로그 영역을 2열 대시보드로 구성
- Account 선택 문제를 줄이기 위해 지갑 연결 시 MetaMask 계정 선택 권한 요청
- Nodit API Key, StableCoin 주소, Payment 주소 입력 후 저장
