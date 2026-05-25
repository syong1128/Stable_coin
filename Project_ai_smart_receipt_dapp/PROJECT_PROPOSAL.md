# 프로젝트 제안 요약

## 주제

**MCP 기반 AI 스마트 영수증 블록체인 DApp**

## 문제의식

기존 스테이블코인 결제 DApp은 토큰 전송과 결제 로그 확인에 집중되어 있습니다. 이번 프로젝트에서는 결제 이후의 데이터를 사람이 이해하기 쉬운 영수증 정보로 바꾸고, 이를 MCP server의 tool로 제공하는 방향으로 확장했습니다.

## 핵심 기능

1. mKRW 스테이블코인 결제 DApp
2. 결제 완료 후 스마트 영수증 생성
3. Ollama 기반 AI 요약
4. MCP server 제공
5. MCP client에서 `list_tools()`, `call_tool()` 검증

## MCP tools

| tool | 설명 |
|---|---|
| `get_mock_wallet_balance` | 테스트 지갑의 mKRW 잔액 조회 |
| `analyze_transaction_hash` | 거래 해시 분석 |
| `generate_smart_receipt` | Ollama 기반 스마트 영수증 생성 |

## 사용 기술

- Solidity
- ERC-20
- GIWA Sepolia
- MetaMask
- ethers.js
- Node.js
- MCP Python SDK
- Ollama / qwen3:0.6b
- HTML / CSS / JavaScript

## 구현 절차

1. mKRW 토큰 컨트랙트 배포
2. 결제 컨트랙트 배포
3. 결제 컨트랙트에 mKRW 토큰 등록
4. 웹 DApp에서 지갑 연결 및 결제 테스트
5. MCP server 구현
6. tool 3개 노출
7. client에서 `list_tools()`, `call_tool()` 검증
8. Ollama로 AI 스마트 영수증 생성

## 예상 결과물

- MCP tool 검증 터미널 출력
- 지갑 연결 가능한 결제 웹사이트
- mKRW 결제 흐름
- 스마트 영수증 카드
- Ollama AI 요약 결과
