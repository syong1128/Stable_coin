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

const $ = (id) => document.getElementById(id);

function shortHash(value) {
  if (!value || value.length < 14) return value;
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

  /*
   * 중요:
   * eth_requestAccounts만 쓰면 MetaMask가 이전에 연결했던 Account 1을 계속 줄 수 있습니다.
   * wallet_requestPermissions를 먼저 호출하면 계정 선택 창이 다시 뜹니다.
   */
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
  const accounts = await window.ethereum.request({ method: "eth_accounts" });

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

  const token = new ethers.Contract(tokenAddress, tokenAbi, provider);
  const decimals = await token.decimals();
  const balance = await token.balanceOf(account);
  const formatted = Number(ethers.formatUnits(balance, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6
  });

  $("balanceText").textContent = `${formatted} mKRW`;
  addLog("Balance", "mKRW 잔액을 조회했습니다.");
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

  const token = new ethers.Contract(tokenAddress, tokenAbi, signer);
  const decimals = await token.decimals();
  const amount = ethers.parseUnits(amountText, decimals);

  const tx = await token.approve(paymentAddress, amount);
  addLog("Approve", `승인 트랜잭션 전송: ${shortHash(tx.hash)}`);
  await tx.wait();
  addLog("Approve", "결제 컨트랙트에 mKRW 사용 권한을 부여했습니다.");
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

  const token = new ethers.Contract(tokenAddress, tokenAbi, provider);
  const decimals = await token.decimals();
  const amount = ethers.parseUnits(amountText, decimals);

  const payment = new ethers.Contract(paymentAddress, paymentAbi, signer);
  const tx = await payment.pay(tokenAddress, amount);
  addLog("Payment", `결제 트랜잭션 전송: ${shortHash(tx.hash)}`);
  await tx.wait();
  addLog("Payment", `${amountText} mKRW 결제가 완료되었습니다.`);
  await refreshBalance();
}

function updatePreview() {
  const raw = Number($("payAmount").value || 0);
  const fee = raw * 0.01;
  const merchant = raw - fee;

  $("previewAmount").textContent = `${raw.toFixed(2)} mKRW`;
  $("previewMerchant").textContent = `${merchant.toFixed(2)} mKRW`;
  $("previewFee").textContent = `${fee.toFixed(2)} mKRW`;
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

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}

loadConfig();
updatePreview();

$("saveConfigBtn").addEventListener("click", saveConfig);
$("addGiwaBtn").addEventListener("click", addGiwaNetwork);
$("connectBtn").addEventListener("click", connectWallet);
$("refreshBtn").addEventListener("click", refreshBalance);
$("approveBtn").addEventListener("click", approvePayment);
$("payBtn").addEventListener("click", pay);
$("payAmount").addEventListener("input", updatePreview);
$("toggleKeyBtn").addEventListener("click", toggleKeyVisibility);
$("clearLogBtn").addEventListener("click", () => {
  $("logBox").innerHTML = "";
  addLog("System", "로그를 초기화했습니다.");
});
