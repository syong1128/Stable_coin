from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("upbit-market-data-mcp")

UPBIT_BASE_URL = "https://api.upbit.com/v1"
DEFAULT_TIMEOUT = 15.0
MAX_MARKETS_PER_REQUEST = 30


class UpbitAPIError(RuntimeError):
    """Raised when Upbit quotation API returns an error response."""


async def _request_json(path: str, params: dict[str, Any] | None = None) -> Any:
    """Call Upbit Quotation REST API and return parsed JSON."""
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, headers=headers) as client:
        response = await client.get(f"{UPBIT_BASE_URL}{path}", params=params or {})

    if response.status_code >= 400:
        try:
            payload = response.json()
        except ValueError:
            payload = response.text
        raise UpbitAPIError(f"Upbit API 오류: HTTP {response.status_code} / {payload}")

    try:
        return response.json()
    except ValueError as exc:
        raise UpbitAPIError("Upbit API 응답을 JSON으로 해석하지 못했습니다.") from exc


def _normalise_market(market: str) -> str:
    market = market.strip().upper()
    if not market:
        return "KRW-BTC"
    if "-" not in market:
        return f"KRW-{market}"
    return market


def _normalise_markets(markets: str) -> list[str]:
    raw = [item.strip() for item in markets.split(",") if item.strip()]
    if not raw:
        raw = ["KRW-BTC"]
    normalised = [_normalise_market(item) for item in raw]
    return normalised[:MAX_MARKETS_PER_REQUEST]


def _format_number(value: Any, digits: int = 2) -> str:
    if value is None:
        return "-"
    if isinstance(value, int):
        return f"{value:,}"
    if isinstance(value, float):
        return f"{value:,.{digits}f}"
    return str(value)


def _format_signed_percent(rate: Any) -> str:
    if rate is None:
        return "-"
    try:
        return f"{float(rate) * 100:+.2f}%"
    except (TypeError, ValueError):
        return str(rate)


def _safe_dt(value: str | None) -> str:
    if not value:
        return "-"
    return value.replace("T", " ")


@mcp.tool()
async def list_krw_markets(keyword: str = "", limit: int = 20) -> str:
    """업비트 원화(KRW) 마켓 목록을 조회합니다. keyword로 BTC, 비트코인처럼 검색할 수 있습니다."""
    limit = max(1, min(int(limit), 100))
    keyword_lower = keyword.strip().lower()
    markets = await _request_json("/market/all", {"isDetails": "true"})

    krw_markets = [item for item in markets if str(item.get("market", "")).startswith("KRW-")]
    if keyword_lower:
        krw_markets = [
            item
            for item in krw_markets
            if keyword_lower in str(item.get("market", "")).lower()
            or keyword_lower in str(item.get("korean_name", "")).lower()
            or keyword_lower in str(item.get("english_name", "")).lower()
        ]

    lines = [f"업비트 KRW 마켓 검색 결과: {len(krw_markets)}개 중 {min(limit, len(krw_markets))}개 표시"]
    for item in krw_markets[:limit]:
        market_warning = item.get("market_warning", "NONE")
        lines.append(
            f"- {item.get('market')} | {item.get('korean_name')} / {item.get('english_name')} | warning={market_warning}"
        )
    return "\n".join(lines)


@mcp.tool()
async def get_ticker(markets: str = "KRW-BTC") -> str:
    """지정한 업비트 마켓의 현재가, 24시간 변동률, 고가/저가, 누적 거래대금을 조회합니다. 예: KRW-BTC,KRW-ETH"""
    market_list = _normalise_markets(markets)
    data = await _request_json("/ticker", {"markets": ",".join(market_list)})
    if not data:
        return f"조회 결과가 없습니다. 입력값을 확인해 주세요: {markets}"

    lines = ["업비트 현재가 조회 결과"]
    for item in data:
        lines.append(
            "\n"
            f"[{item.get('market')}]\n"
            f"현재가: {_format_number(item.get('trade_price'))} KRW\n"
            f"전일 종가: {_format_number(item.get('prev_closing_price'))} KRW\n"
            f"24시간 변동률: {_format_signed_percent(item.get('signed_change_rate'))}\n"
            f"24시간 변동액: {_format_number(item.get('signed_change_price'))} KRW\n"
            f"24시간 고가/저가: {_format_number(item.get('high_price'))} / {_format_number(item.get('low_price'))} KRW\n"
            f"24시간 누적 거래대금: {_format_number(item.get('acc_trade_price_24h'), 0)} KRW\n"
            f"최근 체결 시각(KST): {_safe_dt(item.get('trade_date_kst'))} {_safe_dt(item.get('trade_time_kst'))}"
        )
    return "\n".join(lines)


@mcp.tool()
async def get_orderbook(market: str = "KRW-BTC", depth: int = 5, level: str = "0") -> str:
    """지정한 마켓의 호가창/주문장 데이터를 조회합니다. depth는 1~15, level은 호가 모아보기 단위입니다."""
    depth = max(1, min(int(depth), 15))
    market_code = _normalise_market(market)
    params: dict[str, Any] = {"markets": market_code}
    if str(level).strip() not in {"", "0", "None", "none"}:
        params["level"] = str(level).strip()

    data = await _request_json("/orderbook", params)
    if not data:
        return f"호가 조회 결과가 없습니다. market={market_code}, level={level}"

    book = data[0]
    units = book.get("orderbook_units", [])[:depth]
    lines = [
        f"업비트 호가창: {book.get('market')}",
        f"조회 시각 timestamp(ms): {book.get('timestamp')}",
        f"총 매도 잔량: {_format_number(book.get('total_ask_size'), 8)}",
        f"총 매수 잔량: {_format_number(book.get('total_bid_size'), 8)}",
        "",
        "단계 | 매도호가 ask_price / ask_size | 매수호가 bid_price / bid_size",
    ]
    for idx, unit in enumerate(units, 1):
        lines.append(
            f"{idx:>2} | "
            f"{_format_number(unit.get('ask_price'))} / {_format_number(unit.get('ask_size'), 8)} | "
            f"{_format_number(unit.get('bid_price'))} / {_format_number(unit.get('bid_size'), 8)}"
        )
    return "\n".join(lines)


@mcp.tool()
async def get_market_detail(market: str = "KRW-BTC") -> str:
    """마켓 코드의 한글명, 영문명, 유의 종목 여부 등 기본 정보를 조회합니다."""
    market_code = _normalise_market(market)
    markets = await _request_json("/market/all", {"isDetails": "true"})
    target = next((item for item in markets if item.get("market") == market_code), None)
    if target is None:
        return f"마켓을 찾지 못했습니다: {market_code}"

    warning = target.get("market_warning", "NONE")
    warning_text = "유의 종목" if warning == "CAUTION" else "일반 종목"
    return (
        f"마켓 정보: {market_code}\n"
        f"한글명: {target.get('korean_name')}\n"
        f"영문명: {target.get('english_name')}\n"
        f"상태: {warning_text} ({warning})"
    )


@mcp.tool()
async def get_recent_minute_candles(market: str = "KRW-BTC", unit: int = 1, count: int = 5) -> str:
    """최근 분봉 캔들 데이터를 조회합니다. unit은 1, 3, 5, 10, 15, 30, 60, 240 중 하나입니다."""
    allowed_units = {1, 3, 5, 10, 15, 30, 60, 240}
    unit = int(unit)
    if unit not in allowed_units:
        unit = 1
    count = max(1, min(int(count), 20))
    market_code = _normalise_market(market)

    data = await _request_json(f"/candles/minutes/{unit}", {"market": market_code, "count": count})
    if not data:
        return f"분봉 조회 결과가 없습니다: {market_code}"

    lines = [f"최근 {unit}분봉 캔들: {market_code} / {len(data)}개"]
    for candle in data:
        lines.append(
            f"- {_safe_dt(candle.get('candle_date_time_kst'))} | "
            f"시가 {_format_number(candle.get('opening_price'))}, "
            f"고가 {_format_number(candle.get('high_price'))}, "
            f"저가 {_format_number(candle.get('low_price'))}, "
            f"종가 {_format_number(candle.get('trade_price'))}, "
            f"거래대금 {_format_number(candle.get('candle_acc_trade_price'), 0)}"
        )
    return "\n".join(lines)


@mcp.tool()
async def get_server_status() -> str:
    """MCP 서버 상태와 기준 시각을 확인합니다."""
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    return (
        "Upbit MCP 서버가 실행 중입니다.\n"
        f"server_name: upbit-market-data-mcp\n"
        f"base_url: {UPBIT_BASE_URL}\n"
        f"checked_at: {now}\n"
        "제공 도구: list_krw_markets, get_ticker, get_orderbook, get_market_detail, get_recent_minute_candles"
    )


if __name__ == "__main__":
    mcp.run()
