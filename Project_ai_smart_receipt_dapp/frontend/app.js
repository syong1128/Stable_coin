const GIWA_CHAIN_ID_DEC = 91342;
const GIWA_CHAIN_ID_HEX = "0x164ce";

const tokenAbi = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 value) returns (bool)"
];

const paymentAbi = [
  "function pay(address token, uint256 amount)",
  "function feeRate() view returns (uint256)",
  "function merchant() view returns (address)"
];

let provider;
let signer;
let account;
let lastTxHash = "";

const $ = (id) => document.getElementById(id);

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function shortHash(value) {
  if (!value || value.length < 14) return value || "-";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function addLog(type, message) {
  const box = $("logBox");
  const line = document.createElement("div");

  line.className = "log-line";
  line.innerHTML = `<span>${type}</span><p>${message}</p>`;

  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function loadConfig() {
  $("noditKey").value = localStorage.getItem("noditKey") || "";
  $("tokenAddress").value = localStorage.getItem("tokenAddress") || "";
  $("paymentAddress").value = localStorage.getItem("paymentAddress") || "";
}

function saveConfig() {
  localStorage.setItem("noditKey", $("noditKey").value.trim());
  localStorage.setItem("tokenAddress", $("tokenAddress").value.trim());
  localStorage.setItem("paymentAddress", $("paymentAddress").value.trim());

  addLog("Config", "설정을 저장했습니다.");
}

function getRpcUrl() {
  const key = $("noditKey").value.trim();
  return key ? `https://giwa-sepolia.nodit.io/${key}` : "https://sepolia-rpc.giwa.io";
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getPresetCategoryHint() {
  const preset = $("itemPreset");
  if (!preset) {
    return "";
  }

  const parts = preset.value.split("|");
  return parts[2] || "";
}

function detectLocalCategory(store, itemName, categoryHint = "") {
  const allowedCategories = ["카페/식비", "편의점/소매", "교통", "교육", "기타"];

  if (allowedCategories.includes(categoryHint)) {
    return categoryHint;
  }

  const itemText = String(itemName || "").toLowerCase();
  const storeText = String(store || "").toLowerCase();

  /*
    중요:
    상점명이 KMU Cafe여도 상품명이 Bus Pass면 교통이어야 합니다.
    그래서 상품명을 먼저 보고, 상점명은 마지막 보조 기준으로만 봅니다.
  */

  if (
    hasAny(itemText, [
      "bus",
      "subway",
      "taxi",
      "pass",
      "transport",
      "버스",
      "지하철",
      "택시",
      "교통",
      "교통카드"
    ])
  ) {
    return "교통";
  }

  if (
    hasAny(itemText, [
      "book",
      "textbook",
      "course",
      "class",
      "school",
      "lecture",
      "책",
      "교재",
      "수업",
      "강의",
      "학교",
      "교육"
    ])
  ) {
    return "교육";
  }

  if (
    hasAny(itemText, [
      "convenience",
      "snack",
      "mart",
      "store",
      "water",
      "편의점",
      "간식",
      "마트",
      "소매",
      "생수"
    ])
  ) {
    return "편의점/소매";
  }

  if (
    hasAny(itemText, [
      "cafe",
      "coffee",
      "americano",
      "latte",
      "sandwich",
      "tea",
      "dessert",
      "카페",
      "커피",
      "아메리카노",
      "라떼",
      "카페라떼",
      "샌드위치",
      "디저트",
      "음료"
    ])
  ) {
    return "카페/식비";
  }

  if (
    hasAny(storeText, [
      "cafe",
      "coffee",
      "카페",
      "커피"
    ])
  ) {
    return "카페/식비";
  }

  return "기타";
}

async function addGiwaNetwork() {
  if (!window.ethereum) {
    alert("MetaMask가 필요합니다.");
    return;
  }

  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [{
      chainId: GIWA_CHAIN_ID_HEX,
      chainName: "GIWA Sepolia",
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: [getRpcUrl()],
      blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
    }]
  });

  addLog("Network", "GIWA Sepolia 네트워크를 MetaMask에 추가했습니다.");
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask가 필요합니다.");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }]
    });
  } catch (error) {
    addLog("Wallet", "계정 선택이 취소되었습니다.");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await window.ethereum.request({
    method: "eth_accounts"
  });

  if (!accounts || accounts.length === 0) {
    addLog("Wallet", "연결된 계정이 없습니다.");
    return;
  }

  account = accounts[0];
  signer = await provider.getSigner(account);

  let network = await provider.getNetwork();

  if (Number(network.chainId) !== GIWA_CHAIN_ID_DEC) {
    addLog("Network", "현재 네트워크가 GIWA Sepolia가 아니므로 네트워크 추가를 요청합니다.");
    await addGiwaNetwork();

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner(account);
    network = await provider.getNetwork();
  }

  $("accountText").textContent = account;
  $("networkBadge").textContent = Number(network.chainId) === GIWA_CHAIN_ID_DEC
    ? "GIWA Sepolia"
    : `Chain ${network.chainId}`;

  addLog("Wallet", `지갑 연결 완료: ${shortHash(account)}`);

  await refreshBalance();
}

async function refreshBalance() {
  if (!signer || !account) {
    addLog("Wallet", "먼저 지갑을 연결해 주세요.");
    return;
  }

  const tokenAddress = $("tokenAddress").value.trim();

  if (!ethers.isAddress(tokenAddress)) {
    addLog("Error", "StableCoin 주소가 올바르지 않습니다.");
    return;
  }

  try {
    const token = new ethers.Contract(tokenAddress, tokenAbi, provider);
    const decimals = await token.decimals();
    const balance = await token.balanceOf(account);

    const formatted = Number(ethers.formatUnits(balance, decimals)).toLocaleString(undefined, {
      maximumFractionDigits: 6
    });

    $("balanceText").textContent = `${formatted} mKRW`;

    addLog("Balance", "mKRW 잔액을 조회했습니다.");
  } catch (error) {
    addLog("Error", `잔액 조회 실패: ${error.message}`);
  }
}

async function approvePayment() {
  if (!signer) {
    addLog("Wallet", "먼저 지갑을 연결해 주세요.");
    return;
  }

  const tokenAddress = $("tokenAddress").value.trim();
  const paymentAddress = $("paymentAddress").value.trim();
  const amountText = $("payAmount").value;

  if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(paymentAddress)) {
    addLog("Error", "컨트랙트 주소를 확인해 주세요.");
    return;
  }

  if (!amountText || Number(amountText) <= 0) {
    addLog("Error", "결제 금액을 확인해 주세요.");
    return;
  }

  try {
    const token = new ethers.Contract(tokenAddress, tokenAbi, signer);
    const decimals = await token.decimals();
    const amount = ethers.parseUnits(amountText, decimals);

    const tx = await token.approve(paymentAddress, amount);

    addLog("Approve", `승인 트랜잭션 전송: ${shortHash(tx.hash)}`);

    await tx.wait();

    addLog("Approve", "결제 컨트랙트에 mKRW 사용 권한을 부여했습니다.");
  } catch (error) {
    addLog("Error", `Approve 실패: ${error.message}`);
  }
}

async function pay() {
  if (!signer) {
    addLog("Wallet", "먼저 지갑을 연결해 주세요.");
    return;
  }

  const tokenAddress = $("tokenAddress").value.trim();
  const paymentAddress = $("paymentAddress").value.trim();
  const amountText = $("payAmount").value;

  if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(paymentAddress)) {
    addLog("Error", "컨트랙트 주소를 확인해 주세요.");
    return;
  }

  if (!amountText || Number(amountText) <= 0) {
    addLog("Error", "결제 금액을 확인해 주세요.");
    return;
  }

  try {
    const token = new ethers.Contract(tokenAddress, tokenAbi, provider);
    const decimals = await token.decimals();
    const amount = ethers.parseUnits(amountText, decimals);

    const payment = new ethers.Contract(paymentAddress, paymentAbi, signer);

    /*
      기존 week10 결제 컨트랙트가 pay(address token, uint256 amount)를 쓰는 구조라
      여기서는 itemName을 넘기지 않습니다.
    */
    const tx = await payment.pay(tokenAddress, amount);

    lastTxHash = tx.hash;
    $("receiptTx").textContent = shortHash(tx.hash);

    addLog("Payment", `결제 트랜잭션 전송: ${shortHash(tx.hash)}`);

    await tx.wait();

    addLog("Payment", `${formatNumber(amountText)} mKRW 결제가 완료되었습니다.`);

    updatePreview();
    await refreshBalance();
  } catch (error) {
    addLog("Error", `결제 실패: ${error.message}`);
  }
}

function getPaymentInfo() {
  const raw = Number($("payAmount").value || 0);
  const fee = raw * 0.01;
  const settlement = raw - fee;

  const store = $("storeName").value.trim() || "KMU Cafe";
  const itemName = $("itemName").value.trim() || "Custom Item";
  const categoryHint = detectLocalCategory(store, itemName, getPresetCategoryHint());

  return {
    store,
    items: [itemName],
    amount: formatNumber(raw),
    fee: formatNumber(fee),
    settlement: formatNumber(settlement),
    categoryHint,
    network: "GIWA Sepolia",
    txHash: lastTxHash || "결제 전 미리보기"
  };
}

function updatePreview() {
  const info = getPaymentInfo();

  $("previewAmount").textContent = `${info.amount} mKRW`;
  $("previewMerchant").textContent = `${info.settlement} mKRW`;
  $("previewFee").textContent = `${info.fee} mKRW`;

  $("receiptStore").textContent = info.store;
  $("receiptItems").textContent = info.items.join(", ");
  $("receiptAmount").textContent = `${info.amount} mKRW`;
  $("receiptFee").textContent = `${info.fee} mKRW`;
  $("receiptSettlement").textContent = `${info.settlement} mKRW`;
  $("receiptTx").textContent = lastTxHash ? shortHash(lastTxHash) : "결제 전";
}

function applyPreset() {
  const [name, amount] = $("itemPreset").value.split("|");

  $("itemName").value = name;
  $("payAmount").value = amount;

  lastTxHash = "";

  updatePreview();
}

async function generateAiReceipt() {
  const info = getPaymentInfo();

  $("aiResult").textContent = "Ollama가 영수증을 읽고 있습니다...";

  addLog("AI", "Ollama AI 영수증 생성을 요청했습니다.");

  try {
    const res = await fetch("/api/ai-receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...info,
        model: "qwen3:0.6b"
      })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "AI 영수증 생성 실패");
    }

    $("aiResult").textContent = data.response.trim();

    addLog("AI", "Ollama AI 영수증을 생성했습니다.");
  } catch (error) {
    $("aiResult").textContent = "Ollama 연결에 실패했습니다. 먼저 Ollama를 설치하고 qwen3:0.6b 모델을 실행할 수 있는지 확인해 주세요.";
    addLog("Error", `AI 영수증 실패: ${error.message}`);
  }
}

function toggleKeyVisibility() {
  const input = $("noditKey");
  const button = $("toggleKeyBtn");

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "숨김";
  } else {
    input.type = "password";
    button.textContent = "보기";
  }
}

if (window.ethereum) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    if (!accounts || accounts.length === 0) {
      account = null;
      signer = null;

      $("accountText").textContent = "지갑이 연결되지 않았습니다.";
      $("balanceText").textContent = "-";
      $("networkBadge").textContent = "Disconnected";

      addLog("Wallet", "지갑 연결이 해제되었습니다.");
      return;
    }

    account = accounts[0];
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner(account);

    $("accountText").textContent = account;

    addLog("Wallet", `계정 변경 감지: ${shortHash(account)}`);

    await refreshBalance();
  });

  window.ethereum.on("chainChanged", () => window.location.reload());
}

loadConfig();
updatePreview();

$("saveConfigBtn").addEventListener("click", saveConfig);
$("addGiwaBtn").addEventListener("click", addGiwaNetwork);
$("connectBtn").addEventListener("click", connectWallet);
$("refreshBtn").addEventListener("click", refreshBalance);
$("approveBtn").addEventListener("click", approvePayment);
$("payBtn").addEventListener("click", pay);
$("payAmount").addEventListener("input", () => {
  lastTxHash = "";
  updatePreview();
});
$("itemName").addEventListener("input", updatePreview);
$("storeName").addEventListener("input", updatePreview);
$("itemPreset").addEventListener("change", applyPreset);
$("aiReceiptBtn").addEventListener("click", generateAiReceipt);
$("toggleKeyBtn").addEventListener("click", toggleKeyVisibility);
$("clearLogBtn").addEventListener("click", () => {
  $("logBox").innerHTML = "";
  addLog("System", "로그를 초기화했습니다.");
});