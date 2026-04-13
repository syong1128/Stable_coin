# Sepolia Faucet Project

## 1. Overview
본 프로젝트는 Ethereum Sepolia 테스트 네트워크에서 동작하는 Faucet 시스템입니다.  
사용자는 웹페이지에서 MetaMask를 연결하고 0.01 ETH를 요청할 수 있습니다.

---

## 2. Contract Information
- Network: Sepolia Testnet  
- Contract Address:  
(여기에 본인 컨트랙트 주소 입력)

---

## 3. Features
- MetaMask 지갑 연결
- 사용자 지갑 주소 표시
- Faucet 잔액 조회
- 0.01 ETH 요청 (Claim)
- 트랜잭션 해시 링크 출력

---

## 4. How to Run

1. MetaMask 설치 후 Sepolia 네트워크 설정
2. faucet.html 실행 (Live Server 권장)
3. Connect Wallet 클릭
4. MetaMask 승인
5. Claim 버튼 클릭 → 0.01 ETH 수령

---

## 5. Smart Contract Logic
- 0.01 ETH 고정 지급
- 24시간 재요청 제한
- 잔액 부족 시 요청 실패

---

## 6. Example Transaction
https://sepolia.etherscan.io/tx/0x9350212bfdf82561d82cb6968b60bbc294b133fb41de9abeafb18cf9d973400c

---

## 7. Notes
- Faucet에 ETH가 있어야 정상 동작합니다.
- MetaMask 네트워크는 Sepolia여야 합니다.
