// ============================================================
//  Blockchain Lab #3 — GIWA Sepolia 테스트넷 실습 서버
//  Node.js 내장 http 모듈 기반 API 서버
//  nonce / gas / signature 핵심 개념 실습용
//
//  ⚠️ 보안 경고: 이 서버는 교육/테스트넷 전용입니다.
//  프로덕션(메인넷) 환경에서는 반드시 다음을 적용하세요:
//  - API 인증/인가 (JWT, API Key 등)
//  - HTTPS 적용
//  - Rate Limiting
//  - 환경별 CORS 정책
//  - 개인키를 서버에 직접 보관하지 않을 것 (HSM, KMS 사용)
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const ethers = require('ethers');

dotenv.config();

const PORT = 5500;
const ALLOWED_ORIGIN = 'http://localhost:' + PORT;

// RPC 설정: GIWA Sepolia (OP Stack L2)
const RPC_URL = 'https://sepolia-rpc.giwa.io/';

// GIWA Sepolia Provider 초기화
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 개인키가 있으면 Wallet 생성, 없으면 읽기 전용 모드
let wallet = null;
if (process.env.PRIVATE_KEY) {
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

// MIME 타입 매핑 — 브라우저가 파일을 올바르게 해석하도록 Content-Type 헤더 설정
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

// 동시 송금 방지 플래그 (Nonce 충돌 예방)
let isSending = false;

// 요청 본문 최대 크기 (1KB)
const MAX_BODY_SIZE = 1024;

// ────────────────────────────────────────────
//  헬퍼 함수
// ────────────────────────────────────────────

/**
 * POST 요청 본문(body)을 JSON으로 파싱하는 헬퍼
 * 본문 크기를 MAX_BODY_SIZE로 제한하여 메모리 고갈 공격 방지
 */
function parseBody(req, callback) {
  let body = '';
  let size = 0;
  let destroyed = false;
  req.on('data', function (chunk) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      if (!destroyed) {
        destroyed = true;
        req.destroy();
        callback(new Error('요청 본문이 너무 큽니다 (최대 1KB).'));
      }
      return;
    }
    body += chunk;
  });
  req.on('end', function () {
    if (destroyed) return;
    try { callback(null, JSON.parse(body)); }
    catch (e) { callback(new Error('잘못된 JSON 형식')); }
  });
}

/**
 * JSON 응답 전송 헬퍼
 */
function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

/**
 * 정적 파일 서빙
 * 요청 URL에 해당하는 파일을 읽어서 응답한다.
 */
function serveStaticFile(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const normalizedBase = path.resolve(__dirname);
  const filePath = path.resolve(__dirname, '.' + urlPath);

  // 보안: 디렉토리 트래버설 방지 (정규화된 경로 비교)
  if (!filePath.startsWith(normalizedBase + path.sep) && filePath !== normalizedBase) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 보안: .env 파일 접근 차단
  const basename = path.basename(filePath);
  if (basename === '.env' || basename === '.env.example') {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ────────────────────────────────────────────
//  API 핸들러
// ────────────────────────────────────────────

/**
 * 서버 지갑 주소 + 잔액 + nonce 반환
 * wallet이 없으면 400 에러
 */
async function handleWalletInfo(req, res) {
  if (!wallet) {
    jsonResponse(res, 400, { error: '서버에 PRIVATE_KEY가 설정되지 않았습니다. 읽기 전용 모드입니다.' });
    return;
  }

  const balance = await provider.getBalance(wallet.address);
  const nonce = await provider.getTransactionCount(wallet.address);

  jsonResponse(res, 200, {
    address: wallet.address,
    network: 'GIWA Sepolia Testnet',
    balance: balance.toString(),
    balanceDisplay: ethers.formatEther(balance) + ' ETH',
    nonce: nonce,
  });
}

/**
 * 임의 주소의 잔액 + nonce 반환
 * address 쿼리 파라미터 필수
 */
async function handleBalance(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  let address = urlObj.searchParams.get('address');

  if (!address) {
    jsonResponse(res, 400, { error: 'address 파라미터가 필요합니다. 예: /api/balance?address=0x...' });
    return;
  }

  // 주소 유효성 검사
  try {
    address = ethers.getAddress(address);
  } catch (e) {
    jsonResponse(res, 400, { error: '유효하지 않은 이더리움 주소입니다: ' + address });
    return;
  }

  const balance = await provider.getBalance(address);
  const nonce = await provider.getTransactionCount(address);

  jsonResponse(res, 200, {
    address: address,
    balance: balance.toString(),
    balanceDisplay: ethers.formatEther(balance) + ' ETH',
    nonce: nonce,
  });
}

/**
 * 서버 지갑에서 ETH 송금
 *
 * ⚠️ 보안 경고: 이 API는 교육/테스트넷 전용입니다.
 * 인증 없이 서버의 개인키로 송금하는 구조이므로,
 * 메인넷에서는 절대 이 패턴을 사용하지 마세요.
 * 프로덕션에서는 반드시 API 인증(JWT 등)을 추가하세요.
 */
async function handleSendEth(req, res) {
  if (!wallet) {
    jsonResponse(res, 400, { error: '서버에 PRIVATE_KEY가 설정되지 않았습니다. 읽기 전용 모드입니다.' });
    return;
  }

  // 동시 송금 방지 (Nonce 충돌 예방)
  if (isSending) {
    jsonResponse(res, 409, { error: '이전 송금이 처리 중입니다. 잠시 후 다시 시도하세요.' });
    return;
  }

  // body 파싱 (에러 시 400 응답)
  let body;
  try {
    body = await new Promise(function (resolve, reject) {
      parseBody(req, function (err, data) {
        if (err) reject(err);
        else resolve(data);
      });
    });
  } catch (err) {
    jsonResponse(res, 400, { error: err.message });
    return;
  }

  if (!body.to || !body.amount) {
    jsonResponse(res, 400, { error: 'to(받는 주소)와 amount(ETH 수량)가 필요합니다.' });
    return;
  }

  // 송금 금액 유효성 검사
  const parsedAmount = parseFloat(body.amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    jsonResponse(res, 400, { error: 'amount는 0보다 큰 숫자여야 합니다.' });
    return;
  }

  // 받는 주소 유효성 검사
  let toAddress;
  try {
    toAddress = ethers.getAddress(body.to);
  } catch (e) {
    jsonResponse(res, 400, { error: '유효하지 않은 이더리움 주소입니다: ' + body.to });
    return;
  }

  isSending = true;
  try {
    // 송금 전 nonce 조회
    const nonceBefore = await provider.getTransactionCount(wallet.address);

    // 트랜잭션 전송
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(String(body.amount)),
    });

    // 블록에 포함될 때까지 대기
    const receipt = await tx.wait();

    if (!receipt) {
      jsonResponse(res, 502, { error: '트랜잭션이 교체되었거나 타임아웃되었습니다.' });
      return;
    }

    // 수수료 계산
    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.gasPrice;
    const feeWei = gasUsed * gasPrice;
    const feeEth = ethers.formatEther(feeWei);
    const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');

    // 송금 후 nonce 조회
    const nonceAfter = await provider.getTransactionCount(wallet.address);

    jsonResponse(res, 200, {
      hash: tx.hash,
      from: wallet.address,
      to: toAddress,
      amount: body.amount + ' ETH',
      nonceBefore: nonceBefore,
      nonceAfter: nonceAfter,
      txNonce: tx.nonce,
      gasLimit: tx.gasLimit.toString(),
      gasUsed: gasUsed.toString(),
      gasPrice: gasPriceGwei + ' Gwei',
      fee: feeEth + ' ETH',
      status: receipt.status === 1 ? '성공' : '실패',
      blockNumber: receipt.blockNumber,
      explorerLink: 'https://sepolia-explorer.giwa.io/tx/' + tx.hash,
    });
  } finally {
    isSending = false;
  }
}

/**
 * TX 해시로 트랜잭션 상세 조회
 * hash 쿼리 파라미터 필수
 * nonce, gasLimit, gasUsed, gasPrice, fee, signature r/s/v, explorer 링크 반환
 */
async function handleTxTrack(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const txHash = urlObj.searchParams.get('hash');

  if (!txHash) {
    jsonResponse(res, 400, { error: 'hash 파라미터가 필요합니다. 예: /api/tx?hash=0x...' });
    return;
  }

  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    jsonResponse(res, 404, { error: '트랜잭션을 찾을 수 없습니다. GIWA Sepolia 테스트넷 트랜잭션인지 확인하세요.' });
    return;
  }

  const receipt = await provider.getTransactionReceipt(txHash);

  // 수수료 계산 (영수증이 있는 경우)
  let gasUsed = null;
  let feeEth = null;
  let gasPriceGwei = null;
  let status = 'pending';
  let blockNumber = null;

  if (receipt) {
    gasUsed = receipt.gasUsed.toString();
    feeEth = ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + ' ETH';
    gasPriceGwei = ethers.formatUnits(receipt.gasPrice, 'gwei') + ' Gwei';
    status = receipt.status === 1 ? '성공' : '실패';
    blockNumber = receipt.blockNumber;
  }

  jsonResponse(res, 200, {
    hash: tx.hash,
    from: tx.from,
    to: tx.to || '(컨트랙트 생성)',
    value: tx.value.toString(),
    valueDisplay: ethers.formatEther(tx.value) + ' ETH',
    nonce: tx.nonce,
    gasLimit: tx.gasLimit.toString(),
    gasUsed: gasUsed,
    gasPrice: gasPriceGwei,
    fee: feeEth,
    status: status,
    blockNumber: blockNumber,
    signature: tx.signature ? {
      r: tx.signature.r,
      s: tx.signature.s,
      v: tx.signature.v,
    } : null,
    explorerLink: 'https://sepolia-explorer.giwa.io/tx/' + tx.hash,
  });
}

/**
 * 서명 검증 — Transaction 재구성 방식으로 서명자 주소 복원
 * ethers.js v6의 TransactionResponse에는 serialized가 없으므로
 * 04-verify-sig.js와 동일하게 Transaction 객체를 직접 재구성한다
 */
async function handleVerifySig(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const txHash = urlObj.searchParams.get('hash');

  if (!txHash) {
    jsonResponse(res, 400, { error: 'hash 파라미터가 필요합니다. 예: /api/verify-sig?hash=0x...' });
    return;
  }

  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    jsonResponse(res, 404, { error: '트랜잭션을 찾을 수 없습니다. GIWA Sepolia 테스트넷 트랜잭션인지 확인하세요.' });
    return;
  }

  if (!tx.signature) {
    jsonResponse(res, 400, { error: '서명 데이터를 읽을 수 없습니다.' });
    return;
  }

  // ethers.js v6: TransactionResponse → Transaction으로 직접 재구성
  // provider.getTransaction()은 TransactionResponse를 반환하며
  // serialized 속성이 없으므로 Transaction 객체를 수동으로 구성한다
  let recoveredAddress = null;
  try {
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
    // 서명 복원 실패 시 null 유지
    recoveredAddress = null;
  }

  const originalAddress = tx.from.toLowerCase();
  const recoveredLower = recoveredAddress ? recoveredAddress.toLowerCase() : '';
  const isValid = !!(recoveredAddress && originalAddress === recoveredLower);

  jsonResponse(res, 200, {
    txHash: tx.hash,
    originalFrom: tx.from,
    recoveredAddress: recoveredAddress || '복원 실패',
    isValid: isValid,
    signature: {
      r: tx.signature.r,
      s: tx.signature.s,
      v: tx.signature.v,
    },
    explanation: isValid
      ? '두 주소가 일치합니다. tx.from 주소의 소유자가 이 트랜잭션에 서명했음이 수학적으로 증명됩니다.'
      : '주소 불일치 또는 복원 실패. GIWA Sepolia 테스트넷 트랜잭션인지 확인하세요.',
  });
}

// ────────────────────────────────────────────
//  HTTP 서버 생성 및 라우팅
// ────────────────────────────────────────────

const server = http.createServer(function (req, res) {
  // CORS 설정 — localhost만 허용 (보안)
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const urlPath = req.url.split('?')[0];

  // API 라우트: /api/wallet-info
  if (urlPath === '/api/wallet-info' && req.method === 'GET') {
    handleWalletInfo(req, res).catch(function (err) {
      jsonResponse(res, 502, { error: err.message });
    });
    return;
  }

  // API 라우트: /api/balance?address=0x...
  if (urlPath === '/api/balance' && req.method === 'GET') {
    handleBalance(req, res).catch(function (err) {
      jsonResponse(res, 502, { error: err.message });
    });
    return;
  }

  // API 라우트: /api/send-eth (POST)
  if (urlPath === '/api/send-eth' && req.method === 'POST') {
    handleSendEth(req, res).catch(function (err) {
      jsonResponse(res, 502, { error: err.message });
    });
    return;
  }

  // API 라우트: /api/tx?hash=0x...
  if (urlPath === '/api/tx' && req.method === 'GET') {
    handleTxTrack(req, res).catch(function (err) {
      jsonResponse(res, 502, { error: err.message });
    });
    return;
  }

  // API 라우트: /api/verify-sig?hash=0x...
  if (urlPath === '/api/verify-sig' && req.method === 'GET') {
    handleVerifySig(req, res).catch(function (err) {
      jsonResponse(res, 502, { error: err.message });
    });
    return;
  }

  // 그 외: 정적 파일 서빙
  serveStaticFile(req, res);
});

server.listen(PORT, function () {
  console.log('');
  console.log('  ============================================');
  console.log('   Blockchain Lab #3 — GIWA Sepolia 실습 서버');
  console.log('  ============================================');
  console.log('');
  console.log('   URL     : http://localhost:' + PORT);
  console.log('   RPC     : ' + RPC_URL);

  // 지갑 주소 출력 (없으면 경고)
  if (wallet) {
    console.log('   지갑    : ' + wallet.address);
  } else {
    console.log('   지갑    : ⚠️  PRIVATE_KEY 없음 — 읽기 전용 모드');
    console.log('            (send-eth, wallet-info API 사용 불가)');
  }

  console.log('');
  console.log('   [API 엔드포인트]');
  console.log('   GET  /api/wallet-info         서버 지갑 정보');
  console.log('   GET  /api/balance?address=    임의 주소 잔액 + nonce');
  console.log('   POST /api/send-eth            ETH 송금 {to, amount}');
  console.log('   GET  /api/tx?hash=            트랜잭션 상세 조회');
  console.log('   GET  /api/verify-sig?hash=    서명 검증 (ecrecover)');
  console.log('');
  console.log('   종료: Ctrl+C');
  console.log('');
});

// Graceful shutdown — 진행 중인 연결 정리 후 종료
process.on('SIGINT', function () {
  console.log('\n  서버를 종료합니다...');
  server.close(function () {
    console.log('  서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});
