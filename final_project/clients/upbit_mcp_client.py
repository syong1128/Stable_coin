from __future__ import annotations

import argparse
import asyncio
import contextlib
import os
import sys
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
SERVER_PATH = ROOT / "servers" / "upbit_server.py"

DEMO_CALLS: list[tuple[str, dict[str, Any]]] = [
    ("get_server_status", {}),
    ("list_krw_markets", {"keyword": "비트코인", "limit": 5}),
    ("get_market_detail", {"market": "KRW-BTC"}),
    ("get_ticker", {"markets": "KRW-BTC,KRW-ETH"}),
    ("get_orderbook", {"market": "KRW-BTC", "depth": 5}),
    ("get_recent_minute_candles", {"market": "KRW-BTC", "unit": 1, "count": 5}),
]


def _line(title: str = "") -> str:
    width = 78
    if not title:
        return "─" * width
    label = f" {title} "
    return label + "─" * max(0, width - len(label))


def _extract_text(result: Any) -> str:
    parts: list[str] = []
    for item in result.content:
        text = getattr(item, "text", None)
        parts.append(text if text is not None else str(item))
    return "\n".join(parts).strip()


@contextlib.contextmanager
def _server_errlog(verbose: bool):
    if verbose:
        yield sys.stderr
        return
    with open(os.devnull, "w", encoding="utf-8") as sink:
        yield sink


async def _open_session(verbose: bool = False):
    params = StdioServerParameters(
        command=sys.executable,
        args=[str(SERVER_PATH)],
        cwd=ROOT,
        env=None,
    )
    errlog_cm = _server_errlog(verbose)
    errlog = errlog_cm.__enter__()
    stdio_cm = stdio_client(params, errlog=errlog)
    read, write = await stdio_cm.__aenter__()
    session_cm = ClientSession(read, write)
    session = await session_cm.__aenter__()
    await session.initialize()
    return session, session_cm, stdio_cm, errlog_cm


async def _close_session(session_cm: Any, stdio_cm: Any, errlog_cm: Any) -> None:
    await session_cm.__aexit__(None, None, None)
    await stdio_cm.__aexit__(None, None, None)
    errlog_cm.__exit__(None, None, None)


async def list_tools(verbose: bool = False) -> None:
    session, session_cm, stdio_cm, errlog_cm = await _open_session(verbose)
    try:
        tools = await session.list_tools()
        print(_line("UPBIT MCP TOOLS"))
        for index, tool in enumerate(tools.tools, 1):
            print(f"{index}. {tool.name}")
            if tool.description:
                print(f"   - {tool.description}")
    finally:
        await _close_session(session_cm, stdio_cm, errlog_cm)


async def call_tool(tool: str, args: dict[str, Any], verbose: bool = False) -> None:
    session, session_cm, stdio_cm, errlog_cm = await _open_session(verbose)
    try:
        print(_line(f"CALL {tool}"))
        print(f"arguments = {args}")
        result = await session.call_tool(tool, args)
        is_error = bool(getattr(result, "isError", False) or getattr(result, "is_error", False))
        print(_line("SERVER RESPONSE"))
        if is_error:
            print("MCP 서버가 오류 응답을 반환했습니다.")
        print(_extract_text(result) or "응답 본문이 비어 있습니다.")
    finally:
        await _close_session(session_cm, stdio_cm, errlog_cm)


async def demo(verbose: bool = False) -> None:
    session, session_cm, stdio_cm, errlog_cm = await _open_session(verbose)
    try:
        print(_line("UPBIT MCP FINAL PROJECT DEMO"))
        print(f"Project root : {ROOT}")
        print(f"Server file  : {SERVER_PATH.relative_to(ROOT)}")
        print("Transport    : stdio")

        tools = await session.list_tools()
        print("\n[1] MCP Tool Discovery")
        for index, tool in enumerate(tools.tools, 1):
            print(f"  {index}. {tool.name}")

        print("\n[2] MCP Tool Calls")
        for tool_name, arguments in DEMO_CALLS:
            print("\n" + _line(tool_name))
            result = await session.call_tool(tool_name, arguments)
            print(_extract_text(result) or "응답 본문이 비어 있습니다.")

        print("\n" + _line("DONE"))
        print("클라이언트가 MCP 서버의 도구를 발견하고, Upbit 데이터를 요청해 응답받는 흐름을 확인했습니다.")
    finally:
        await _close_session(session_cm, stdio_cm, errlog_cm)


def _parse_key_value(items: list[str]) -> dict[str, Any]:
    args: dict[str, Any] = {}
    for item in items:
        if "=" not in item:
            raise ValueError(f"인자는 key=value 형식이어야 합니다: {item}")
        key, value = item.split("=", 1)
        value = value.strip()
        if value.isdigit():
            args[key.strip()] = int(value)
        else:
            args[key.strip()] = value
    return args


def main() -> None:
    parser = argparse.ArgumentParser(description="Upbit MCP stdio client")
    sub = parser.add_subparsers(dest="command", required=True)

    demo_parser = sub.add_parser("demo", help="기본 과제 데모를 실행합니다.")
    demo_parser.add_argument("--verbose", action="store_true", help="서버 내부 로그를 표시합니다.")

    tools_parser = sub.add_parser("tools", help="MCP 서버의 tool 목록을 출력합니다.")
    tools_parser.add_argument("--verbose", action="store_true", help="서버 내부 로그를 표시합니다.")

    call_parser = sub.add_parser("call", help="원하는 MCP tool을 직접 호출합니다.")
    call_parser.add_argument("tool", help="호출할 tool 이름")
    call_parser.add_argument("pairs", nargs="*", help="key=value 형식의 인자. 예: market=KRW-BTC depth=10")
    call_parser.add_argument("--verbose", action="store_true", help="서버 내부 로그를 표시합니다.")

    args = parser.parse_args()
    if args.command == "demo":
        asyncio.run(demo(args.verbose))
    elif args.command == "tools":
        asyncio.run(list_tools(args.verbose))
    elif args.command == "call":
        asyncio.run(call_tool(args.tool, _parse_key_value(args.pairs), args.verbose))


if __name__ == "__main__":
    main()
