// ============================================================
//  3단계: 트랜잭션 추적 (교수님 핵심 개념 실습)
//  사용법: node scripts/03-track-tx.js <트랜잭션_해시>
//  예시:   node scripts/03-track-tx.js 0xabc...123
// ============================================================

const dotenv = require('dotenv');
const ethers = require('ethers');
dotenv.config();

// RPC 설정: GIWA Sepolia (OP Stack L2)
const RPC_URL = 'https://sepolia-rpc.giwa.io/';

async function main() {
  console.log('');
  console.log('  ============================================');
  console.log('   3단계: 트랜잭션 추적');
  console.log('  ============================================');
  console.log('');

  // CLI 인수: 트랜잭션 해시
  const txHash = process.argv[2];
  if (!txHash) {
    console.log('  사용법: node scripts/03-track-tx.js <트랜잭션_해시>');
    console.log('  예시:   node scripts/03-track-tx.js 0xabc...123');
    console.log('');
    console.log('  → 02-send-eth.js 실행 후 출력된 Tx Hash를 입력하세요.');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // GIWA Sepolia 네트워크 확인 (잘못된 RPC 설정으로 메인넷 접속 방지)
  const network = await provider.getNetwork();
  if (network.chainId !== 91342n) {
    console.log('  ❌ 오류: GIWA Sepolia 테스트넷(chainId: 91342)이 아닙니다.');
    console.log('     현재 연결된 네트워크 chainId:', network.chainId.toString());
    console.log('     RPC URL을 확인하세요.');
    process.exit(1);
  }

  console.log('  조회 중:', txHash);
  console.log('');

  // ────────────────────────────────────────────
  //  트랜잭션 데이터 조회 (미포함/포함 모두 가능)
  // ────────────────────────────────────────────
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.log('  ❌ 트랜잭션을 찾을 수 없습니다.');
    console.log('     - 해시가 올바른지 확인하세요');
    console.log('     - GIWA Sepolia 테스트넷의 트랜잭션인지 확인하세요');
    process.exit(1);
  }

  // 영수증 조회 (블록에 포함된 경우에만 존재)
  const receipt = await provider.getTransactionReceipt(txHash);

  // ────────────────────────────────────────────
  //  트랜잭션 기본 정보 출력
  // ────────────────────────────────────────────
  console.log('  [트랜잭션 기본 정보]');
  console.log('  Hash      :', tx.hash);
  console.log('  From      :', tx.from);
  console.log('  To        :', tx.to || '(컨트랙트 생성)');
  console.log('  Value     :', ethers.formatEther(tx.value), 'ETH');
  console.log('  Nonce     :', tx.nonce);
  console.log('  Gas Limit :', tx.gasLimit.toString());
  console.log('');

  // ────────────────────────────────────────────
  //  서명 정보 (r, s, v) 출력
  // ────────────────────────────────────────────
  console.log('  [서명 정보 (Private Key 소유 증명)]');
  console.log('  r :', tx.signature ? tx.signature.r : 'N/A');
  console.log('  s :', tx.signature ? tx.signature.s : 'N/A');
  console.log('  v :', tx.signature ? tx.signature.v : 'N/A');
  console.log('');

  // ────────────────────────────────────────────
  //  영수증 정보 (블록 포함 후)
  // ────────────────────────────────────────────
  if (receipt) {
    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.gasPrice;
    const feeWei = gasUsed * gasPrice;
    const feeEth = ethers.formatEther(feeWei);
    const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');

    console.log('  [트랜잭션 영수증 (블록 포함 후)]');
    console.log('  상태      :', receipt.status === 1 ? '성공 ✅' : '실패 ❌');
    console.log('  블록 번호 :', receipt.blockNumber);
    console.log('  Gas Used  :', gasUsed.toString());
    console.log('  Gas Price :', gasPriceGwei, 'Gwei');
    console.log('  실제 수수료:', feeEth, 'ETH');
    console.log('');
  } else {
    console.log('  [영수증] 아직 블록에 포함되지 않음 (pending)');
    console.log('');
  }

  // ────────────────────────────────────────────
  //  교수님 핵심 개념 매핑 설명
  // ────────────────────────────────────────────
  console.log('  ============================================');
  console.log('   [교수님 핵심 개념 매핑]');
  console.log('  ============================================');
  console.log('');

  console.log('  1. Nonce =', tx.nonce);
  console.log('     → "이 트랜잭션이 몇 번째인지 (중복 방지)"');
  console.log('     → 이 주소에서 보낸', tx.nonce + 1, '번째 트랜잭션');
  console.log('     → 같은 Nonce는 한 번만 처리됨 → 동일 tx 재전송 불가');
  console.log('');

  if (receipt) {
    console.log('  2. Gas Used =', receipt.gasUsed.toString());
    console.log('     → "트랜잭션 수수료 (스팸 방지)"');
    console.log('     → 이더리움 네트워크 자원 사용량 (계산 비용)');
    console.log('     → 비쌀수록 빨리 처리됨, 너무 적으면 실패할 수 있음');
    console.log('');
  }

  console.log('  3. Signature (r, s, v)');
  console.log('     → "Private Key로 서명 = 내가 보냈다는 증명"');
  console.log('     → r, s: 서명값 (타원 곡선 수학으로 생성)');
  console.log('     → v: 복원 파라미터 (서명자 주소를 역산하는 데 사용)');
  console.log('     → Private Key 없이는 이 서명을 만들 수 없음');
  console.log('     → 하지만 서명만으로 Public Key(=주소)를 복원 가능 (ecrecover)');
  console.log('');

  // GIWA Explorer 링크
  console.log('  [GIWA Explorer에서 확인]');
  console.log('  https://sepolia-explorer.giwa.io/tx/' + tx.hash);
  console.log('');
}

main().catch(function (err) {
  console.error('');
  console.error('  ❌ 오류 발생:', err.message);
  console.error('');
  process.exit(1);
});
