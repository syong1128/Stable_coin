# Blockchain Lab #7 Final Submission

이 저장소는 ERC-20 토큰과 스테이킹 컨트랙트, 그리고 HTML 프론트엔드를 포함한 최종 제출본입니다.

## 폴더 구조

- `MyToken.sol` : ERC-20 토큰 컨트랙트
- `Staking.sol` : 스테이킹 컨트랙트
- `staking_dapp.html` : MetaMask 연동 HTML 프론트엔드
- `SUBMISSION.md` : 제출용 정리 문서
- `.gitignore`

## 과제 요구사항 대응

### 1. 스테이킹 컨트랙트 생성 및 테스트넷 배포
- `Staking.sol` 사용
- Sepolia 또는 Giwa testnet에 배포

### 2. 기본 기능 구현
- stake
- withdraw
- staked balance 조회

### 3. 추가 기능
- 이번 제출본은 과제의 필수 요구사항 중심으로 구성
- reward, time lock, emergency withdraw는 선택 기능이므로 제외

### 4. Remix IDE 사용
- Remix에서 두 컨트랙트를 배포하면 됨

## 배포 순서

### 1) MyToken.sol 배포
- Remix에서 `MyToken.sol` 컴파일
- `Deploy` 실행
- 배포 주소 복사

### 2) Staking.sol 배포
- Remix에서 `Staking.sol` 컴파일
- constructor 인자에 방금 배포한 MyToken 주소 입력
- `Deploy` 실행
- 배포 주소 복사

### 3) approve 실행
- `MyToken` 컨트랙트에서
- spender = Staking 주소
- amount = 예: `10000000000000000000` (10 MTK, decimals 18 기준)

### 4) stake 실행
- `Staking` 컨트랙트에서 `stake(10000000000000000000)` 실행

### 5) withdraw 실행
- `Staking` 컨트랙트에서 `withdraw(10000000000000000000)` 실행

## HTML 사용 방법

1. `staking_dapp.html` 열기
2. MetaMask 연결
3. Token address 입력
4. Staking address 입력
5. 필요 시 ABI 확인
6. Approve -> Stake -> Withdraw 순서로 실행

