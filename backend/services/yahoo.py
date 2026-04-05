import datetime
import yfinance as yf
import requests
import pandas as pd

PERIOD_MAP = {
    "1D":  ("1d",  "5m"),
    "1W":  ("5d",  "1h"),
    "1M":  ("1mo", "1d"),
    "1Y":  ("1y",  "1d"),
    "5Y":  ("5y",  "1wk"),
    "10Y": ("10y", "1mo"),
    "15Y": ("max", "1mo"),
    "MAX": ("max", "1mo"),
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json,text/html,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

# Shared session so cookies/crumb are reused across requests
_session = requests.Session()
_session.headers.update(HEADERS)

# Currencies we convert TO EUR (everything else stays as-is)
CONVERT_TO_EUR = {"USD", "GBp", "GBX", "GBP", "CNY", "JPY", "CHF", "CAD", "AUD", "HKD"}

# Simple in-process FX cache (TTL 5 min)
_fx_cache: dict[str, tuple[float, datetime.datetime]] = {}
_FX_TTL = datetime.timedelta(minutes=5)


def _get_eur_rate(from_currency: str) -> float | None:
    """Return how many EUR 1 unit of from_currency is worth."""
    if from_currency == "EUR":
        return 1.0
    # GBp / GBX = pence → convert to GBP first
    if from_currency in ("GBp", "GBX"):
        gbp_rate = _get_eur_rate("GBP")
        return (gbp_rate / 100) if gbp_rate else None

    pair = f"{from_currency}EUR=X"
    now = datetime.datetime.utcnow()
    if pair in _fx_cache:
        rate, ts = _fx_cache[pair]
        if now - ts < _FX_TTL:
            return rate
    try:
        fx = yf.Ticker(pair, session=_session)
        rate = fx.fast_info.last_price
        if rate:
            _fx_cache[pair] = (rate, now)
            return rate
    except Exception:
        pass
    return None


def _to_eur(value: float | None, rate: float | None) -> float | None:
    if value is None or rate is None:
        return None
    return round(value * rate, 4)


def search_assets(query: str, limit: int = 12) -> list[dict]:
    try:
        s = yf.Search(query, max_results=limit, news_count=0, session=_session)
        quotes = s.quotes
        if quotes:
            return _map_quotes(quotes[:limit])
    except Exception:
        pass

    for host in ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]:
        try:
            url = f"https://{host}/v1/finance/search"
            params = {
                "q": query,
                "quotesCount": limit,
                "newsCount": 0,
                "enableFuzzyQuery": False,
                "quotesQueryId": "tss_match_phrase_query",
            }
            resp = requests.get(url, params=params, headers=HEADERS, timeout=8)
            resp.raise_for_status()
            quotes = resp.json().get("quotes", [])
            if quotes:
                return _map_quotes(quotes[:limit])
        except Exception:
            continue
    return []


def _map_quotes(quotes: list) -> list[dict]:
    type_labels = {
        "EQUITY": "Aktie",
        "ETF": "ETF",
        "CRYPTOCURRENCY": "Krypto",
        "FUTURE": "Future",
        "INDEX": "Index",
        "MUTUALFUND": "Fonds",
        "CURRENCY": "Währung",
    }
    return [
        {
            "symbol": q.get("symbol", ""),
            "name": q.get("longname") or q.get("shortname", ""),
            "type": type_labels.get(q.get("quoteType", ""), q.get("quoteType", "")),
            "exchange": q.get("exchDisp", q.get("exchange", "")),
        }
        for q in quotes
        if q.get("symbol")
    ]


def get_quote(symbol: str) -> dict:
    ticker = yf.Ticker(symbol, session=_session)

    # fast_info uses the lightweight chart endpoint — more reliable on cloud IPs
    fi = None
    try:
        fi = ticker.fast_info
    except Exception:
        pass

    # ticker.info uses quoteSummary — may fail on rate-limited IPs; always try separately
    info = {}
    try:
        info = ticker.info or {}
    except Exception:
        pass

    price = prev_close = None
    if fi:
        try:
            price      = fi.last_price
            prev_close = fi.previous_close
        except Exception:
            pass
    if price is None:
        price = info.get("regularMarketPrice") or info.get("currentPrice")
    if prev_close is None:
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")

    # Currency: prefer fast_info (more reliable), fall back to info
    orig_currency = "USD"
    if fi:
        try:
            orig_currency = fi.currency or "USD"
        except Exception:
            pass
    if orig_currency == "USD":
        orig_currency = info.get("currency", "USD")

    # FX conversion
    rate = _get_eur_rate(orig_currency) if orig_currency in CONVERT_TO_EUR else None
    display_currency = "EUR" if rate else orig_currency

    def conv(v):
        return _to_eur(v, rate) if rate else (round(v, 4) if v is not None else None)

    price_eur      = conv(price)
    prev_close_eur = conv(prev_close)
    change         = (price_eur - prev_close_eur) if price_eur and prev_close_eur else 0
    change_pct     = (change / prev_close_eur * 100) if prev_close_eur else 0

    year_high = year_low = None
    if fi:
        try:
            year_high = fi.year_high
            year_low  = fi.year_low
        except Exception:
            pass
    year_high = year_high or info.get("fiftyTwoWeekHigh")
    year_low  = year_low  or info.get("fiftyTwoWeekLow")

    # Market state: fast_info.market_state is reliable even when info fails
    market_state = "CLOSED"
    if fi:
        try:
            ms = fi.market_state
            if ms:
                market_state = ms
        except Exception:
            pass
    if market_state == "CLOSED":
        market_state = info.get("marketState", "CLOSED")

    last_trade_ts  = info.get("regularMarketTime")
    last_trade_iso = None
    if last_trade_ts:
        try:
            last_trade_iso = datetime.datetime.fromtimestamp(
                last_trade_ts, tz=datetime.timezone.utc
            ).isoformat()
        except Exception:
            pass

    # Logo: use website domain with Clearbit for stocks/ETFs
    website  = info.get("website") or ""
    logo_url = None
    if website:
        try:
            from urllib.parse import urlparse
            domain   = urlparse(website).netloc.replace("www.", "")
            logo_url = f"https://logo.clearbit.com/{domain}"
        except Exception:
            pass

    return {
        "symbol":       symbol.upper(),
        "name":         info.get("longName") or info.get("shortName", symbol),
        "logoUrl":      logo_url,
        "price":        price_eur,
        "previousClose":prev_close_eur,
        "change":       round(change, 4),
        "changePercent":round(change_pct, 4),
        "currency":     display_currency,
        "originalCurrency": orig_currency,
        "marketState":  market_state,
        "lastTradeTime":last_trade_iso,
        "marketCap":    info.get("marketCap"),
        "volume":       info.get("volume") or info.get("regularMarketVolume"),
        "avgVolume":    info.get("averageVolume"),
        "type":         info.get("quoteType", ""),
        "exchange":     info.get("fullExchangeName") or info.get("exchange", ""),
        "sector":       info.get("sector"),
        "industry":     info.get("industry"),
        "description":  info.get("longBusinessSummary") or info.get("description"),
        "website":      info.get("website"),
        "yearHigh":     conv(year_high),
        "yearLow":      conv(year_low),
        "pe":           info.get("trailingPE"),
        "eps":          conv(info.get("trailingEps")),
        "dividendYield":   info.get("dividendYield"),
        # Analyst consensus (stocks only — None for crypto/ETFs)
        "recommendationKey":         info.get("recommendationKey"),
        "recommendationMean":        info.get("recommendationMean"),
        "numberOfAnalystOpinions":   info.get("numberOfAnalystOpinions"),
        "targetMeanPrice":           conv(info.get("targetMeanPrice")),
        "targetHighPrice":           conv(info.get("targetHighPrice")),
        "targetLowPrice":            conv(info.get("targetLowPrice")),
    }


def get_history(symbol: str, period: str = "1Y") -> list[dict]:
    yf_period, interval = PERIOD_MAP.get(period.upper(), ("1y", "1d"))
    ticker = yf.Ticker(symbol, session=_session)

    # Get currency for this ticker
    try:
        orig_currency = ticker.fast_info.currency
    except Exception:
        orig_currency = "USD"

    rate = _get_eur_rate(orig_currency) if orig_currency in CONVERT_TO_EUR else None

    # For 1D: include pre+post market data → gives ~08:00–23:00 German time
    use_prepost = period.upper() == "1D"
    hist = ticker.history(period=yf_period, interval=interval, prepost=use_prepost)
    if hist.empty:
        return []

    if period.upper() == "15Y":
        tz     = hist.index.tz
        cutoff = pd.Timestamp.now(tz=tz) - pd.DateOffset(years=15)
        hist   = hist[hist.index >= cutoff]

    def cv(v):
        if pd.isna(v):
            return None
        fv = float(v)
        return round(fv * rate, 4) if rate else round(fv, 4)

    return [
        {
            "date":   idx.isoformat(),
            "close":  cv(row["Close"]),
            "open":   cv(row["Open"]),
            "high":   cv(row["High"]),
            "low":    cv(row["Low"]),
            "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
        }
        for idx, row in hist.iterrows()
        if not pd.isna(row["Close"])
    ]
