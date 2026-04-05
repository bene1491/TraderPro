import asyncio
import json
import datetime
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.yahoo import _get_eur_rate
from routes.quotes import _cached_quote

router = APIRouter()


def _binance_symbol(symbol: str) -> str | None:
    """Convert yfinance symbol to Binance stream symbol, or None if not crypto."""
    sym = symbol.upper()
    if "-USD" in sym or "-USDT" in sym:
        base = sym.replace("-USDT", "").replace("-USD", "")
        return f"{base.lower()}usdt"
    if "-EUR" in sym:
        base = sym.replace("-EUR", "")
        return f"{base.lower()}eur"
    return None


async def _stream_crypto(websocket: WebSocket, symbol: str, binance_sym: str):
    """Connect to Binance miniTicker and forward EUR price every tick."""
    url = f"wss://stream.binance.com:9443/ws/{binance_sym}@miniTicker"
    use_eur_pair = binance_sym.endswith("eur")

    async with websockets.connect(url, ping_interval=20, ping_timeout=30) as ws:
        last_ping = asyncio.get_event_loop().time()
        async for raw in ws:
            if websocket.client_state.value != 1:
                break
            msg = json.loads(raw)
            price_raw = float(msg.get("c", 0))

            if use_eur_pair:
                price_eur = price_raw
            else:
                rate = _get_eur_rate("USD")
                price_eur = round(price_raw * rate, 4) if rate else price_raw

            await websocket.send_json({
                "price": price_eur,
                "currency": "EUR",
                "source": "live",
                "ts": datetime.datetime.utcnow().isoformat(),
            })

            # Send a WS ping to the client every 20s to keep Render proxy alive
            now = asyncio.get_event_loop().time()
            if now - last_ping > 20:
                try:
                    await websocket.send_json({"ping": True})
                except Exception:
                    break
                last_ping = now


async def _stream_quote(websocket: WebSocket, symbol: str):
    """For stocks/ETFs: push from cache every 2s."""
    while True:
        if websocket.client_state.value != 1:
            break
        try:
            data = await _cached_quote(symbol.upper())
            await websocket.send_json({
                "price": data["price"],
                "change": data["change"],
                "changePercent": data["changePercent"],
                "currency": data["currency"],
                "marketState": data["marketState"],
                "source": "yahoo",
                "ts": datetime.datetime.utcnow().isoformat(),
            })
        except Exception:
            pass
        await asyncio.sleep(2)


@router.websocket("/ws/{symbol}")
async def ws_price(websocket: WebSocket, symbol: str):
    await websocket.accept()
    try:
        binance_sym = _binance_symbol(symbol)
        if binance_sym:
            await _stream_crypto(websocket, symbol, binance_sym)
        else:
            await _stream_quote(websocket, symbol)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
