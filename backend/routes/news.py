import asyncio
import datetime
import yfinance as yf
from fastapi import APIRouter

router = APIRouter()

# Simple in-memory cache: symbol → (list, timestamp)
_cache: dict[str, tuple[list, datetime.datetime]] = {}
_TTL = datetime.timedelta(minutes=15)
_locks: dict[str, asyncio.Lock] = {}


def _get_lock(symbol: str) -> asyncio.Lock:
    if symbol not in _locks:
        _locks[symbol] = asyncio.Lock()
    return _locks[symbol]


def _fetch_news(symbol: str) -> list[dict]:
    ticker = yf.Ticker(symbol)
    try:
        raw = ticker.news or []
    except Exception:
        return []

    result = []
    for item in raw[:10]:
        content = item.get("content", {})
        if not content:
            continue

        title = content.get("title", "")
        summary = content.get("summary", "")
        pub_date = content.get("pubDate", "")
        provider = content.get("provider", {}).get("displayName", "")
        url = content.get("canonicalUrl", {}).get("url", "") or content.get("clickThroughUrl", {}).get("url", "")

        # Thumbnail: prefer a small resolution (170x128), fall back to originalUrl
        thumbnail = None
        try:
            thumb = content.get("thumbnail") or {}
            resolutions = thumb.get("resolutions") or []
            # Find a small-ish thumbnail (prefer non-original)
            small = next((r["url"] for r in resolutions if r.get("tag") != "original"), None)
            thumbnail = small or thumb.get("originalUrl")
        except Exception:
            pass

        if title and url:
            result.append({
                "title":     title,
                "summary":   summary,
                "url":       url,
                "publisher": provider,
                "pubDate":   pub_date,
                "thumbnail": thumbnail,
            })

    return result


@router.get("/news/{symbol}")
async def get_news(symbol: str):
    sym = symbol.upper()
    now = datetime.datetime.utcnow()

    async with _get_lock(sym):
        if sym in _cache:
            data, ts = _cache[sym]
            if now - ts < _TTL:
                return data

        news = await asyncio.get_event_loop().run_in_executor(None, _fetch_news, sym)
        _cache[sym] = (news, now)
        return news
