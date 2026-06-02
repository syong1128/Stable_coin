# Upbit MCP 기반 코인 데이터 조회 프로그램 설명서

## 1. 주제 선정 이유

기말고사 과제의 목적은 MCP 서버와 MCP 클라이언트의 역할을 분리하여, 외부 데이터를 표준화된 방식으로 요청하고 확인할 수 있는 프로그램을 만드는 것입니다. 본 프로젝트에서는 국내 가상자산 거래소인 Upbit의 공개 시세 API를 사용하여 코인 가격, 주문장/호가창, 마켓 정보, 캔들 데이터를 조회하도록 구현했습니다.

Upbit의 시세 조회 API는 API Key 없이도 사용할 수 있으므로, 제출용 과제에서 실행 환경을 단순하게 유지할 수 있습니다. 또한 현재가와 호가창 데이터는 실시간성이 있어 MCP 서버가 외부 데이터 제공자 역할을 한다는 점을 명확히 보여주기에 적합합니다.

## 2. 전체 구조

```text
사용자
  ↓
MCP 클라이언트(clients/upbit_mcp_client.py)
  ↓ stdio transport
MCP 서버(servers/upbit_server.py)
  ↓ HTTP GET
Upbit Quotation REST API
  ↓ JSON 응답
MCP 서버
  ↓ 정리된 텍스트 응답
MCP 클라이언트 출력
```

MCP 클라이언트는 서버 파일을 직접 실행하고, 서버와 MCP 세션을 초기화합니다. 이후 `list_tools()`를 통해 서버가 제공하는 도구 목록을 확인한 다음, `call_tool()`을 사용해 특정 기능을 호출합니다.

MCP 서버는 `FastMCP`를 사용해 구현했습니다. 각 기능은 `@mcp.tool()` 데코레이터로 등록되어 MCP 클라이언트가 호출할 수 있는 도구가 됩니다.

## 3. 구현한 MCP Tool

### 3.1 get_server_status

서버가 정상적으로 실행 중인지 확인하는 도구입니다. 서버 이름, Upbit API 기본 URL, 제공 도구 목록을 반환합니다.

### 3.2 list_krw_markets

Upbit의 전체 마켓 목록 중 KRW 마켓만 필터링하여 출력합니다. `keyword` 인자를 사용하면 `BTC`, `비트코인`, `Ethereum`과 같은 검색어로 원하는 종목을 찾을 수 있습니다.

### 3.3 get_market_detail

특정 마켓 코드의 상세 정보를 조회합니다. 예를 들어 `KRW-BTC`를 입력하면 한글명, 영문명, 유의 종목 여부를 확인할 수 있습니다.

### 3.4 get_ticker

현재가 정보를 조회합니다. 현재가, 전일 종가, 24시간 변동률, 24시간 고가와 저가, 24시간 누적 거래대금을 출력합니다. 여러 마켓을 쉼표로 구분하여 동시에 조회할 수 있습니다.

예시 입력:

```bash
python clients/upbit_mcp_client.py call get_ticker markets=KRW-BTC,KRW-ETH
```

### 3.5 get_orderbook

호가창 데이터를 조회합니다. 매도호가와 매수호가를 단계별로 보여주며, `depth` 인자를 통해 출력할 호가 단계 수를 조절할 수 있습니다.

예시 입력:

```bash
python clients/upbit_mcp_client.py call get_orderbook market=KRW-BTC depth=10
```

### 3.6 get_recent_minute_candles

최근 분봉 캔들 데이터를 조회합니다. 시가, 고가, 저가, 종가, 거래대금을 확인할 수 있습니다. `unit`은 1, 3, 5, 10, 15, 30, 60, 240분을 지원합니다.

## 4. 주요 코드 설명

### 4.1 서버 초기화

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("upbit-market-data-mcp")
```

`FastMCP` 객체를 생성하면 MCP 서버의 기본 구조가 만들어집니다. 이후 함수에 `@mcp.tool()`을 붙이면 해당 함수가 MCP Tool로 등록됩니다.

### 4.2 Upbit API 요청 함수

```python
async def _request_json(path, params=None):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        response = await client.get(f"{UPBIT_BASE_URL}{path}", params=params or {})
```

서버 내부에서는 `httpx.AsyncClient`를 사용하여 Upbit API에 비동기 HTTP 요청을 보냅니다. 오류 응답이 오면 상태 코드와 응답 내용을 포함해 예외를 발생시킵니다.

### 4.3 MCP 클라이언트 연결

```python
params = StdioServerParameters(
    command=sys.executable,
    args=[str(SERVER_PATH)],
    cwd=ROOT,
)
```

클라이언트는 서버 파일을 Python 프로세스로 실행하고, stdio transport를 통해 MCP 메시지를 주고받습니다.

## 5. 실행 결과 예시

```text
UPBIT MCP FINAL PROJECT DEMO
Project root : .../upbit-mcp-final-project
Server file  : servers/upbit_server.py
Transport    : stdio

[1] MCP Tool Discovery
  1. list_krw_markets
  2. get_ticker
  3. get_orderbook
  4. get_market_detail
  5. get_recent_minute_candles
  6. get_server_status

[2] MCP Tool Calls
...
```

실행 결과에서 tool discovery와 tool call이 모두 보이면 MCP 서버와 클라이언트 연결이 정상적으로 작동한 것입니다.

## 6. 한계와 개선 가능성

현재 프로젝트는 공개 시세 조회 기능만 제공합니다. 따라서 API Key가 필요한 주문, 계좌 조회, 입출금 기능은 포함하지 않았습니다. 향후 개선한다면 다음 기능을 추가할 수 있습니다.

- WebSocket 기반 실시간 체결 데이터 스트리밍
- 여러 코인의 가격 변동률 비교 표 생성
- 특정 가격 이상/이하 알림 기능
- 간단한 웹 UI 또는 대시보드 추가
- LLM 클라이언트와 연결하여 자연어로 코인 데이터 질의

## 7. 결론

본 프로젝트는 MCP 서버가 외부 API인 Upbit Quotation API를 감싸고, MCP 클라이언트가 서버의 도구를 발견한 뒤 호출하는 구조로 구현되었습니다. 이를 통해 MCP의 핵심 흐름인 도구 등록, 도구 발견, 도구 호출, 외부 데이터 반환 과정을 확인할 수 있습니다.
