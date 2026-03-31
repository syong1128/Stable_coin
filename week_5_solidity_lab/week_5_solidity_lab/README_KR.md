# Solidity Lab Simulator + 과제용 컨트랙트

이 압축 파일에는 두 가지가 들어 있습니다.

1. `index.html`
   - 단일 HTML 기반 Solidity Lab Simulator
   - 브라우저에서 바로 열어서 Lab 1 실습처럼 컴파일/배포/호출 흐름을 연습할 수 있습니다.
2. `contracts/`
   - Remix에 바로 붙여 넣어 테스트할 수 있는 과제용 Solidity 코드

---

## 포함 파일

- `contracts/HelloCombined.sol`
- `contracts/Faucet.sol`
- `index.html`

---

## 1. HelloCombined.sol 설명

수업 자료의 HelloWorld와 HelloNumber를 합친 버전입니다.

구성:
- `string private _greeting = "Hello, World!";`
- `int private _number = 10;`
- `greet()` : greeting 조회
- `setGreeting(string)` : greeting 변경
- `getNumber()` : number 조회
- `setNumber(int)` : number 변경

즉, 과제에서 말한
- greeting과 number를 함께 보기
- `number`를 `public`에서 `private`으로 바꿨을 때 자동 getter가 사라지는 점 확인
- 외부에서 값을 읽기 위한 함수 추가
를 모두 반영했습니다.

---

## 2. Faucet.sol 설명

이번 주 과제 체크 포인트를 반영한 Faucet 예시입니다.

기능:
- `owner` 저장
- `msg.sender` 확인 가능
- `msg.value`로 입금 테스트 가능 (`deposit`, `receive`, `fallback`)
- `withdraw(uint256 amount)`
  - 최대 0.1 ETH 제한
  - 같은 주소는 24시간에 1번만 출금 가능
- `withdrawAll()`
  - owner만 실행 가능
  - 다른 계정으로 실행하면 실패
- `mapping(address => uint256) public lastWithdrawTime`
  - 주소별 마지막 출금 시간 추적

---

## 3. Remix에서 테스트하는 순서

### HelloCombined.sol
1. Remix에서 `HelloCombined.sol` 파일 생성
2. 코드 붙여넣기
3. Solidity Compiler에서 컴파일
4. Deploy & Run Transactions에서 배포
5. 아래 함수 실행
   - `greet()`
   - `getNumber()`
   - `setGreeting(...)`
   - `setNumber(...)`
6. 다시 조회해서 값이 바뀌는지 확인

### Faucet.sol
1. Remix에서 `Faucet.sol` 파일 생성
2. 코드 붙여넣기
3. 컴파일
4. 배포할 때 `Value`에 예: `1 ether` 또는 `0.5 ether` 입력 후 배포
5. 테스트 항목
   - `owner()` 확인
   - 다른 Account로 바꿔서 `deposit()` 호출하며 `msg.value` 테스트
   - 다른 Account로 `withdraw(100000000000000000)` 호출 → 0.1 ETH
   - 같은 Account로 바로 다시 `withdraw(...)` 호출 → 24시간 제한으로 실패
   - owner가 아닌 계정으로 `withdrawAll()` 호출 → 실패
   - owner 계정으로 `withdrawAll()` 호출 → 성공

---

## 4. index.html 실행 방법

- 파일을 더블클릭해서 브라우저에서 열면 됩니다.
- 권장 브라우저: Chrome / Edge 최신 버전
- 별도 설치나 서버 실행이 필요 없습니다.

---

## 5. 발표 때 설명하면 좋은 포인트

### HelloCombined
- `public` 변수는 자동 getter가 생김
- `private` 변수는 외부에서 직접 읽을 수 없음
- 그래서 `getNumber()` 같은 함수를 직접 만들어야 함

### Faucet
- `msg.sender`는 함수를 부른 계정
- `msg.value`는 같이 보낸 ETH 양
- `mapping`으로 주소별 상태를 저장할 수 있음
- `modifier onlyOwner`로 접근 제어 가능
- `require`로 24시간 제한, 최대 출금량 제한 구현 가능

