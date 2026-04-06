import re
import asyncio
import datetime
import xml.etree.ElementTree as ET
import requests as http
from fastapi import APIRouter, HTTPException

router = APIRouter()

EDGAR_HEADERS = {
    "User-Agent": "TraderPro info@traderpro.app",
    "Accept-Encoding": "gzip, deflate",
    "Accept": "application/json",
}

OPENFIGI_URL = "https://api.openfigi.com/v3/mapping"

GURUS = [
    {"slug": "buffett",       "name": "Warren Buffett",        "fund": "Berkshire Hathaway",     "cik": "0001067983", "initials": "WB", "color": "#3b82f6", "description": "Value-Investor, Orakel von Omaha"},
    {"slug": "burry",         "name": "Michael Burry",         "fund": "Scion Asset Management", "cik": "0001649339", "initials": "MB", "color": "#ef4444", "description": "Bekannt aus The Big Short"},
    {"slug": "ackman",        "name": "Bill Ackman",           "fund": "Pershing Square",        "cik": "0001336528", "initials": "BA", "color": "#8b5cf6", "description": "Aktivistischer Investor"},
    {"slug": "druckenmiller", "name": "Stanley Druckenmiller", "fund": "Duquesne Family Office", "cik": "0001536411", "initials": "SD", "color": "#f59e0b", "description": "Macro-Legende"},
    {"slug": "tepper",        "name": "David Tepper",          "fund": "Appaloosa Management",   "cik": "0001656456", "initials": "DT", "color": "#00b15d", "description": "Hedge-Fund-Manager"},
    {"slug": "soros",         "name": "George Soros",          "fund": "Soros Fund Management",  "cik": "0001029160", "initials": "GS", "color": "#06b6d4", "description": "Macro-Investor"},
]

_cache: dict = {}
_CACHE_TTL = datetime.timedelta(hours=6)


def _get_13f_filings(cik: str) -> list[dict]:
    cik_padded = cik.lstrip("0").zfill(10)
    url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
    resp = http.get(url, headers=EDGAR_HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    recent  = data.get("filings", {}).get("recent", {})
    forms   = recent.get("form", [])
    accnums = recent.get("accessionNumber", [])
    dates   = recent.get("filingDate", [])
    filings = []
    for form, accnum, date in zip(forms, accnums, dates):
        if form in ("13F-HR", "13F-HR/A"):
            filings.append({"accessionNumber": accnum, "filingDate": date})
    return filings


def _candidate_ciks(company_cik: str, accnum: str) -> list[str]:
    """
    The archive path uses the FILER's CIK (first 10 digits of accession number),
    which often differs from the company's own CIK (e.g. Berkshire files via Donnelley).
    Try filer CIK first, then fall back to company CIK.
    """
    accnum_nd  = accnum.replace("-", "")
    filer_cik  = str(int(accnum_nd[:10]))   # strip leading zeros
    company    = company_cik.lstrip("0")
    seen, out  = set(), []
    for c in [filer_cik, company]:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _fetch_infotable_xml(company_cik: str, accnum: str) -> str:
    accnum_nd = accnum.replace("-", "")

    for path_cik in _candidate_ciks(company_cik, accnum):
        # 1. Try the EDGAR index JSON to locate the exact filename
        idx_url = (
            f"https://www.sec.gov/Archives/edgar/data/{path_cik}"
            f"/{accnum_nd}/{accnum}-index.json"
        )
        try:
            idx_resp = http.get(idx_url, headers=EDGAR_HEADERS, timeout=10)
            if idx_resp.ok:
                docs = idx_resp.json().get("documents", [])
                for doc in docs:
                    dtype = doc.get("type", "").upper()
                    dname = doc.get("document", "").lower()
                    if "information table" in dtype or "infotable" in dname or (
                        dname.endswith(".xml") and "primary" not in dtype.lower()
                        and "13f-hr" not in dtype.lower()
                    ):
                        doc_url = (
                            f"https://www.sec.gov/Archives/edgar/data/{path_cik}"
                            f"/{accnum_nd}/{doc['document']}"
                        )
                        r = http.get(doc_url, headers={**EDGAR_HEADERS, "Accept": "*/*"}, timeout=20)
                        if r.ok and "<" in r.text:
                            return r.text
        except Exception:
            pass

        # 2. Fallback: probe common filenames
        for fname in ["infotable.xml", "informationtable.xml", "form13fInfoTable.xml",
                      "13fInfoTable.xml", "primarydocument.xml"]:
            url = (
                f"https://www.sec.gov/Archives/edgar/data/{path_cik}"
                f"/{accnum_nd}/{fname}"
            )
            try:
                r = http.get(url, headers={**EDGAR_HEADERS, "Accept": "*/*"}, timeout=10)
                if r.ok and "<infoTable" in r.text:
                    return r.text
            except Exception:
                continue

    raise ValueError(f"Infotable XML nicht gefunden für {accnum}")


def _strip_namespaces(xml_text: str) -> str:
    """Remove XML namespace declarations and prefixes so ET can parse cleanly."""
    # Strip BOM / leading whitespace
    text = xml_text.lstrip("\ufeff\r\n\t ")
    # Remove namespace declarations:  xmlns="..." or xmlns:ns="..."
    text = re.sub(r'\s+xmlns(?::[a-zA-Z0-9_-]+)?="[^"]*"', "", text)
    # Remove namespace prefixes from tags: <ns:tag  →  <tag  and </ns:tag  →  </tag
    text = re.sub(r"<(/?)(?:[a-zA-Z0-9_-]+:)([a-zA-Z0-9_][a-zA-Z0-9_.-]*)", r"<\1\2", text)
    return text


def _parse_infotable(xml_text: str) -> list[dict]:
    cleaned = _strip_namespaces(xml_text)

    try:
        root = ET.fromstring(cleaned)
    except ET.ParseError:
        # Last resort: find the first <informationTable ...> and parse from there
        m = re.search(r"<informationTable", cleaned, re.IGNORECASE)
        if not m:
            raise ValueError("Kein <informationTable> in der XML-Datei gefunden")
        root = ET.fromstring(_strip_namespaces(cleaned[m.start():]))

    holdings = []
    for entry in root.iter("infoTable"):
        try:
            name   = (entry.findtext("nameOfIssuer") or "").strip()
            cusip  = (entry.findtext("cusip") or "").strip()
            val_s  = (entry.findtext("value") or "0").replace(",", "")
            value  = int(float(val_s)) * 1000  # reported in thousands USD

            shrs_el = entry.find("shrsOrPrnAmt")
            shares  = 0
            if shrs_el is not None:
                shrs_s = (shrs_el.findtext("sshPrnamt") or "0").replace(",", "")
                shares = int(float(shrs_s))

            if cusip and value > 0:
                holdings.append({"name": name, "cusip": cusip, "value": value, "shares": shares, "ticker": None})
        except Exception:
            continue

    holdings.sort(key=lambda h: h["value"], reverse=True)
    return holdings


def _map_tickers(holdings: list[dict]) -> list[dict]:
    top    = holdings[:50]
    cusips = [h["cusip"] for h in top]
    ticker_map: dict[str, str] = {}

    for i in range(0, len(cusips), 25):
        batch = cusips[i: i + 25]
        try:
            payload = [{"idType": "ID_CUSIP", "idValue": c} for c in batch]
            resp    = http.post(OPENFIGI_URL, json=payload,
                                headers={"Content-Type": "application/json"}, timeout=15)
            if not resp.ok:
                continue
            for cusip, result in zip(batch, resp.json()):
                items = result.get("data", [])
                if not items:
                    continue
                for item in items:
                    if item.get("exchCode") in ("US", "UN", "UA", "UQ", "UM", "UW"):
                        ticker_map[cusip] = item.get("ticker", "")
                        break
                if cusip not in ticker_map:
                    ticker_map[cusip] = items[0].get("ticker", "")
        except Exception:
            pass

    for h in holdings:
        h["ticker"] = ticker_map.get(h["cusip"])
    return holdings


def _add_changes(current: list[dict], previous: list[dict]) -> list[dict]:
    prev_map = {h["cusip"]: h for h in previous}
    for h in current:
        prev = prev_map.get(h["cusip"])
        if prev is None:
            h["change"] = "new"
            h["shares_diff"] = None
        else:
            diff = h["shares"] - prev["shares"]
            pct  = round(diff / prev["shares"] * 100, 1) if prev["shares"] else 0
            h["change"]      = "unchanged" if abs(pct) < 1 else ("increased" if diff > 0 else "decreased")
            h["shares_diff"] = pct
    return current


def _fetch_holdings(guru: dict) -> dict:
    cik      = guru["cik"]
    filings  = _get_13f_filings(cik)
    if not filings:
        raise ValueError("Keine 13F-Filings gefunden")

    xml_cur  = _fetch_infotable_xml(cik, filings[0]["accessionNumber"])
    holdings = _parse_infotable(xml_cur)

    prev_holdings: list[dict] = []
    if len(filings) > 1:
        try:
            xml_prev      = _fetch_infotable_xml(cik, filings[1]["accessionNumber"])
            prev_holdings = _parse_infotable(xml_prev)
        except Exception:
            pass

    holdings = _map_tickers(holdings)
    if prev_holdings:
        holdings = _add_changes(holdings, prev_holdings)

    total = sum(h["value"] for h in holdings)
    for h in holdings:
        h["pct"] = round(h["value"] / total * 100, 2) if total else 0

    with_ticker = [h for h in holdings if h.get("ticker")][:25]
    result      = with_ticker if len(with_ticker) >= 5 else holdings[:25]

    return {
        "guru":        guru,
        "filing_date": filings[0]["filingDate"],
        "total_value": total,
        "holdings":    result,
    }


@router.get("/gurus")
async def get_gurus():
    return {"gurus": GURUS}


@router.get("/gurus/{cik}/holdings")
async def get_holdings(cik: str):
    guru = next((g for g in GURUS if g["cik"] == cik), None)
    if not guru:
        raise HTTPException(status_code=404, detail="Guru nicht gefunden")

    now = datetime.datetime.utcnow()
    if cik in _cache:
        data, ts = _cache[cik]
        if now - ts < _CACHE_TTL:
            return data

    loop = asyncio.get_event_loop()
    try:
        data = await loop.run_in_executor(None, _fetch_holdings, guru)
        _cache[cik] = (data, now)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Daten konnten nicht geladen werden: {e}")
