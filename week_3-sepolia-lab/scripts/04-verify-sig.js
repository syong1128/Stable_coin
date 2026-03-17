// ============================================================
//  보너스: 서명 검증 (cryptographic proof)
//  트랜잭션 해시로 서명자를 수학적으로 증명하는 스크립트
//
//  사용법: node scripts/04-verify-sig.js <트랜잭션_해시>
//  예시:   node scripts/04-verify-sig.js 0xabc...123
// ============================================================

const dotenv = require('dotenv');
const ethers = require('ethers');
dotenv.config();

// RPC 설정: GIWA Sepolia (OP Stack L2)
const RPC_URL = 'https://sepolia-rpc.giwa.io/';

async function main() {
  console.log('');
  console.log('  ============================================');
  console.log('   보너스: 서명 검증 (수학적 증명)');
  console.log('  ============================================');
  console.log('');

  // CLI 인수: 트랜잭션 해시
  const txHash = process.argv[2];
  if (!txHash) {
    console.log('  사용법: node scripts/04-verify-sig.js <트랜잭션_해시>');
    console.log('  예시:   node scripts/04-verify-sig.js 0xabc...123');
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

  // 트랜잭션 데이터 조회
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.log('  ❌ 트랜잭션을 찾을 수 없습니다.');
    console.log('     - 해시가 올바른지 확인하세요');
    console.log('     - GIWA Sepolia 테스트넷의 트랜잭션인지 확인하세요');
    process.exit(1);
  }

  // ────────────────────────────────────────────
  //  서명 데이터 (r, s, v) 출력
  // ────────────────────────────────────────────
  console.log('  [서명 데이터]');
  console.log('  원본 From :', tx.from, '(블록체인이 기록한 서명자)');
  console.log('');

  if (!tx.signature) {
    console.log('  ❌ 서명 데이터를 읽을 수 없습니다.');
    process.exit(1);
  }

  console.log('  r :', tx.signature.r);
  console.log('  s :', tx.signature.s);
  console.log('  v :', tx.signature.v);
  console.log('');

  // ────────────────────────────────────────────
  //  서명 검증 과정 설명
  // ────────────────────────────────────────────
  console.log('  ============================================');
  console.log('   [서명 검증 과정 — 3단계]');
  console.log('  ============================================');
  console.log('');
  console.log('  STEP 1: 데이터 + 서명 조합');
  console.log('          트랜잭션 데이터(직렬화) + 서명(r, s, v)을 준비한다.');
  console.log('');
  console.log('  STEP 2: ecrecover (타원 곡선 서명 복원)');
  console.log('          서명값(r, s, v) + 트랜잭션 해시 → Public Key 복원');
  console.log('          → Private Key 없이도 서명자의 Public Key를 알 수 있다!');
  console.log('');
  console.log('  STEP 3: Public Key → 이더리움 주소 변환');
  console.log('          복원된 Public Key를 keccak256 해싱 → 마지막 20바이트 = 주소');
  console.log('          → 이 주소 == tx.from 이면 "서명이 유효하다"');
  console.log('');

  // ────────────────────────────────────────────
  //  ethers.js v6로 서명자 주소 복원
  //  TransactionResponse → Transaction 재구성 → .from 으로 ecrecover 실행
  // ────────────────────────────────────────────
  console.log('  ⏳ 서명 검증 중...');
  console.log('');

  let recoveredAddress;
  try {
    // ethers.js v6: TransactionResponse → Transaction으로 변환
    // provider.getTransaction()은 TransactionResponse를 반환하며
    // serialized 속성이 없으므로 직접 Transaction 객체를 재구성한다
    const rawTx = new ethers.Transaction();
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
  } catch (e) {
    console.log('  ⚠️  서명 복원 중 오류가 발생했습니다:', e.message);
    console.log('');
    recoveredAddress = null;
  }

  // ────────────────────────────────────────────
  //  복원 주소 vs 원본 From 주소 비교
  // ────────────────────────────────────────────
  const originalAddress = tx.from.toLowerCase();
  const recoveredLower = recoveredAddress ? recoveredAddress.toLowerCase() : '';

  console.log('  [검증 결과]');
  console.log('  원본 From  :', tx.from);
  console.log('  복원 주소  :', recoveredAddress || '복원 실패');
  console.log('');

  if (recoveredAddress && originalAddress === recoveredLower) {
    console.log('  ✅ 서명 검증 성공!');
    console.log('');
    console.log('  두 주소가 일치합니다:');
    console.log('  → 이것이 "서명이 유효하다는 수학적 증명"입니다.');
    console.log('  → tx.from 주소의 소유자가 이 트랜잭션에 서명했음이 확인됨');
    console.log('  → Private Key를 공개하지 않고도 본인임을 증명 가능!');
  } else {
    console.log('  ❌ 서명 검증 실패 또는 주소 불일치');
    console.log('');
    console.log('  주의: 이 스크립트는 GIWA Sepolia 트랜잭션에서만 정확히 동작합니다.');
    console.log('  tx.serialized가 없는 경우 ecrecover 대안 방식이 적용됩니다.');
  }

  console.log('');
  console.log('  ============================================');
  console.log('   [핵심 요약]');
  console.log('  ============================================');
  console.log('');
  console.log('  이더리움의 신뢰 메커니즘:');
  console.log('  → 중앙 서버 없이 서명(r,s,v)만으로 "누가 보냈는지" 증명');
  console.log('  → 위조 불가: Private Key 없이는 올바른 서명 생성 불가');
  console.log('  → 검증 가능: 누구나 ecrecover로 서명자 주소를 복원 가능');
  console.log('  → 이것이 블록체인의 "trustless" 특성의 핵심!');
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
