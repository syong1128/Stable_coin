// ============================================================
//  2단계: GIWA Sepolia ETH 송금 (핵심 실습)
//  사용법: node scripts/02-send-eth.js [받는주소] [ETH수량]
//  예시:   node scripts/02-send-eth.js 0xABC...123 0.001
//  주소 생략 시 자기 자신에게 송금 (자기 송금 테스트)
// ============================================================

const dotenv = require('dotenv');
const ethers = require('ethers');
dotenv.config();

// RPC 설정: GIWA Sepolia (OP Stack L2)
const RPC_URL = 'https://sepolia-rpc.giwa.io/';

async function main() {
  console.log('');
  console.log('  ============================================');
  console.log('   2단계: GIWA Sepolia ETH 송금');
  console.log('  ============================================');
  console.log('');

  // .env에서 개인키 로드
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('  ❌ 오류: .env 파일에 PRIVATE_KEY를 설정하세요.');
    process.exit(1);
  }

  // GIWA Sepolia 테스트넷 연결 + Wallet 생성
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // GIWA Sepolia 네트워크 확인 (잘못된 RPC 설정으로 메인넷 접속 방지)
  const network = await provider.getNetwork();
  if (network.chainId !== 91342n) {
    console.log('  ❌ 오류: GIWA Sepolia 테스트넷(chainId: 91342)이 아닙니다.');
    console.log('     현재 연결된 네트워크 chainId:', network.chainId.toString());
    console.log('     RPC URL을 확인하세요.');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const myAddress = wallet.address;

  // CLI 인수 파싱
  let toAddress = process.argv[2];  // 받는 주소 (생략 가능)
  const amount = process.argv[3] || '0.001';  // ETH 수량 (기본 0.001)

  // 송금 금액 유효성 검사
  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    console.log('  ❌ 오류: ETH 수량은 양수여야 합니다:', amount);
    process.exit(1);
  }

  // 받는 주소가 없으면 자기 자신에게 송금
  if (!toAddress) {
    toAddress = myAddress;
    console.log('  ℹ️  받는 주소가 지정되지 않아 자기 자신에게 송금합니다.');
    console.log('     (자기 송금도 실제 트랜잭션이 발생합니다 — gas 차감됨!)');
    console.log('');
    console.log('  💡 Tip: 옆 친구의 지갑 주소를 인자로 넣어 서로 송금해보세요!');
    console.log('     예시: node scripts/02-send-eth.js 0x친구주소 0.001');
    console.log('');
  }

  // 주소 유효성 검사
  try {
    toAddress = ethers.getAddress(toAddress);
  } catch (e) {
    console.log('  ❌ 잘못된 이더리움 주소:', toAddress);
    process.exit(1);
  }

  console.log('  [송금 정보]');
  console.log('  보내는 주소:', myAddress);
  console.log('  받는 주소 :', toAddress);
  console.log('  송금 수량 :', amount, 'ETH');
  console.log('');

  // ────────────────────────────────────────────
  //  송금 전: 잔액 + Nonce 확인
  // ────────────────────────────────────────────
  const balanceBefore = await provider.getBalance(myAddress);
  const nonceBefore = await provider.getTransactionCount(myAddress);

  console.log('  [송금 전 상태]');
  console.log('  잔액      :', ethers.formatEther(balanceBefore), 'ETH');
  console.log('  현재 Nonce:', nonceBefore);
  console.log('  → 이번 tx는 Nonce', nonceBefore, '로 발행됩니다');
  console.log('');

  // ────────────────────────────────────────────
  //  트랜잭션 전송
  // ────────────────────────────────────────────
  console.log('  ⏳ 트랜잭션 전송 중...');

  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amount),
  });

  console.log('');
  console.log('  [트랜잭션 발행됨 — 블록 포함 대기 중]');
  console.log('  Tx Hash   :', tx.hash);
  console.log('  Nonce     :', tx.nonce, '← 예상 Nonce와 일치 확인!');
  console.log('  Gas Limit :', tx.gasLimit.toString());
  console.log('');
  console.log('  ⏳ 블록 포함 대기 중... (약 1~3초 소요)');

  // 블록에 포함될 때까지 대기
  const receipt = await tx.wait();

  if (!receipt) {
    console.log('  ⚠️  트랜잭션이 교체되었거나 타임아웃되었습니다.');
    process.exit(1);
  }

  // ────────────────────────────────────────────
  //  영수증(Receipt) 분석
  // ────────────────────────────────────────────
  // 실제 수수료 계산 (BigInt 연산)
  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.gasPrice;
  const feeWei = gasUsed * gasPrice;
  const feeEth = ethers.formatEther(feeWei);
  const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');

  console.log('');
  console.log('  ✅ 트랜잭션 완료!');
  console.log('');
  console.log('  [트랜잭션 영수증]');
  console.log('  블록 번호 :', receipt.blockNumber);
  console.log('  상태      :', receipt.status === 1 ? '성공 ✅' : '실패 ❌');
  console.log('  Gas Used  :', gasUsed.toString(), '(실제 사용량)');
  console.log('  Gas Price :', gasPriceGwei, 'Gwei');
  console.log('  실제 수수료:', feeEth, 'ETH  ←  이게 실제로 차감된 gas 비용!');
  console.log('');

  // ────────────────────────────────────────────
  //  송금 후: Nonce +1 증가 확인
  // ────────────────────────────────────────────
  const balanceAfter = await provider.getBalance(myAddress);
  const nonceAfter = await provider.getTransactionCount(myAddress);

  console.log('  [송금 후 상태]');
  console.log('  잔액      :', ethers.formatEther(balanceAfter), 'ETH');
  console.log('  현재 Nonce:', nonceAfter, '← Nonce가', nonceBefore, '→', nonceAfter, '로 +1 증가!');
  console.log('');

  // GIWA Explorer 링크
  console.log('  [GIWA Explorer에서 확인]');
  console.log('  ' + 'https://sepolia-explorer.giwa.io/tx/' + tx.hash);
  console.log('');

  // ────────────────────────────────────────────
  //  학습 포인트
  // ────────────────────────────────────────────
  console.log('  ============================================');
  console.log('   [학습 포인트]');
  console.log('  ============================================');
  console.log('');
  console.log('  ✅ Nonce 자동 증가:', nonceBefore, '→', nonceAfter);
  console.log('     → 이더리움이 트랜잭션 순서를 보장하는 방법');
  console.log('     → 같은 Nonce의 tx를 두 번 보내면 하나만 처리됨 (리플레이 방지)');
  console.log('');
  console.log('  ✅ Gas가 실제로 차감됨:', feeEth, 'ETH');
  console.log('     → Gas = 이더리움 네트워크 사용 수수료 (스팸 방지)');
  console.log('     → Gas Price는 네트워크 혼잡도에 따라 변동');
  console.log('');
}

main().catch(function (err) {
  console.error('');
  console.error('  ❌ 오류 발생:', err.message);
  if (err.message.includes('insufficient funds')) {
    console.error('  → 잔액이 부족합니다. Faucet에서 ETH를 받아오세요:');
    console.error('     https://faucet.giwa.io/');
  }
  console.error('');
  process.exit(1);
});
