// ============================================================
//  1단계: GIWA Sepolia 잔액 + Nonce 확인
//  Faucet에서 받은 ETH를 코드로 직접 확인하는 스크립트
// ============================================================

const dotenv = require('dotenv');
const ethers = require('ethers');
dotenv.config();

// ────────────────────────────────────────────
//  RPC 설정: GIWA Sepolia (OP Stack L2)
// ────────────────────────────────────────────
const RPC_URL = 'https://sepolia-rpc.giwa.io/';

async function main() {
  console.log('');
  console.log('  ============================================');
  console.log('   1단계: GIWA Sepolia 잔액 + Nonce 확인');
  console.log('  ============================================');
  console.log('');

  // .env에서 개인키 로드
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('  ❌ 오류: .env 파일에 PRIVATE_KEY를 설정하세요.');
    console.log('     .env.example 파일을 참고하여 .env를 만드세요.');
    process.exit(1);
  }

  // GIWA Sepolia 테스트넷에 연결
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // GIWA Sepolia 네트워크 확인 (잘못된 RPC 설정으로 메인넷 접속 방지)
  const network = await provider.getNetwork();
  if (network.chainId !== 91342n) {
    console.log('  ❌ 오류: GIWA Sepolia 테스트넷(chainId: 91342)이 아닙니다.');
    console.log('     현재 연결된 네트워크 chainId:', network.chainId.toString());
    console.log('     RPC URL을 확인하세요.');
    process.exit(1);
  }

  // Wallet 객체 생성 (주소 추출용)
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = wallet.address;

  console.log('  [연결 정보]');
  console.log('  RPC URL  :', RPC_URL);
  console.log('  네트워크 : GIWA Sepolia 테스트넷 (OP Stack L2)');
  console.log('');

  // 잔액 조회 (단위: wei → ETH 변환)
  const balanceWei = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balanceWei);

  // 현재 nonce 조회 (트랜잭션 카운트 = 지금까지 보낸 tx 수)
  const nonce = await provider.getTransactionCount(address);

  console.log('  [지갑 정보]');
  console.log('  주소     :', address);
  console.log('  잔액     :', balanceEth, 'ETH');
  console.log('  현재 Nonce:', nonce);
  console.log('');

  // ────────────────────────────────────────────
  //  학습 포인트
  // ────────────────────────────────────────────
  console.log('  ============================================');
  console.log('   [학습 포인트]');
  console.log('  ============================================');
  console.log('');
  console.log('  ✅ Faucet에서 받은 ETH가 코드로 확인됨');
  console.log('');
  console.log('  GIWA Sepolia (OP Stack L2) 특성:');
  console.log('  → 블록 타임 ~1초 (이더리움 L1 대비 12배 빠름)');
  console.log('  → 수수료 ~1원 (초저가, L2 실행비 + L1 데이터비)');
  console.log('  → Nonce, Gas, Signature 모두 메인넷과 동일하게 동작!');
  console.log('');
  console.log('  "공짜 ETH인데 왜 Faucet이 필요한가?"');
  console.log('  → 트랜잭션을 보내려면 Gas(수수료)를 내야 합니다');
  console.log('  → 만약 Gas가 없다면? 누구나 무한으로 트랜잭션을 보낼 수 있고');
  console.log('     → 네트워크가 스팸으로 마비됩니다 (DoS 공격)');
  console.log('  → Gas = 네트워크를 보호하는 경제적 장벽!');
  console.log('');
  console.log('  Nonce란?');
  console.log('  → 이 주소에서 보낸 트랜잭션의 순번');
  console.log('  → 현재 Nonce =', nonce, '→ 다음 tx는 Nonce', nonce, '로 발행됨');
  console.log('  → 동일한 Nonce의 tx는 하나만 처리됨 (중복 방지!)');
  console.log('');

  // BigInt 비교로 정확한 잔액 0 체크
  if (balanceWei === 0n) {
    console.log('  ⚠️  잔액이 0입니다. Faucet에서 테스트 ETH를 받아오세요:');
    console.log('     https://faucet.giwa.io/  (0.005 ETH / 24h)');
    console.log('     https://faucet.lambda256.io/giwa-sepolia  (0.01 ETH / 24h)');
  }

  console.log('');
}

main().catch(function (err) {
  console.error('');
  console.error('  ❌ 오류 발생:', err.message);
  console.error('');
  process.exit(1);
});
