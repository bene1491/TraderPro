import asyncio
import datetime
from fastapi import APIRouter, HTTPException, Query
from services.yahoo import get_quote, get_history

router = APIRouter()

VALID_PERIODS = {"1D", "1W", "1M", "1Y", "5Y", "10Y", "15Y", "MAX"}

# In-memory quote cache: symbol -> (data, timestamp, lock)
_cache: dict[str, tuple[dict, datetime.datetime]] = {}
_locks: dict[str, asyncio.Lock] = {}
CACHE_TTL = datetime.timedelta(seconds=8)


def _get_lock(symbol: str) -> asyncio.Lock:
    if symbol not in _locks:
        _locks[symbol] = asyncio.Lock()
    return _locks[symbol]


async def _cached_quote(symbol: str) -> dict:
    lock = _get_lock(symbol)
    async with lock:
        now = datetime.datetime.utcnow()
        if symbol in _cache:
            data, ts = _cache[symbol]
            if now - ts < CACHE_TTL:
                return data
        # Cache miss or expired → fetch fresh
        data = await asyncio.to_thread(get_quote, symbol)
        _cache[symbol] = (data, now)
        return data


@router.get("/quotes/batch")
async def batch_quotes(symbols: str):
    """Fetch quotes for up to 20 comma-separated symbols in one request."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:20]
    results = await asyncio.gather(
        *[_cached_quote(s) for s in symbol_list],
        return_exceptions=True,
    )
    return {sym: (None if isinstance(res, Exception) else res) for sym, res in zip(symbol_list, results)}


@router.get("/quote/{symbol}")
async def quote(symbol: str):
    try:
        data = await _cached_quote(symbol.upper())
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quote failed: {str(e)}")


@router.get("/history/{symbol}")
async def history(symbol: str, period: str = Query(default="1Y")):
    period = period.upper()
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period. Choose from: {', '.join(VALID_PERIODS)}",
        )
    try:
        data = await asyncio.to_thread(get_history, symbol.upper(), period)
        return {"symbol": symbol.upper(), "period": period, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"History failed: {str(e)}")
