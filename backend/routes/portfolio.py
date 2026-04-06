import os
import re
import json
import base64
import requests as http
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

SYSTEM_PROMPT = """Du bist ein erfahrener, unabhängiger Finanzanalyst. Du analysierst Portfolio-Screenshots eines Privatanlegers.

Gib deine Antwort AUSSCHLIESSLICH als valides JSON zurück — kein Text davor oder danach, keine Markdown-Codeblöcke.

Das JSON muss exakt diesem Schema entsprechen:
{
  "gesamtwert": <Zahl in EUR oder null falls nicht erkennbar>,
  "positionen": [
    {"name": "<Name>", "wert": <Zahl|null>, "anteil": <Prozent als Zahl>, "kategorie": "<ETF|Aktie|Krypto|Anleihe|Sonstiges>"}
  ],
  "klassen": [
    {"name": "<Klassenname>", "anteil": <Prozent als Zahl>}
  ],
  "bewertung": "<solide|gut|sehr gut|risikobehaftet|einseitig|ausgewogen>",
  "bewertung_kurz": "<Ein Satz Gesamturteil>",
  "staerken": ["<Stärke 1>", "<Stärke 2>"],
  "redundanzen": [
    {"titel": "<Titel>", "beschreibung": "<Erklärung>", "ueberlappung": <Prozent als Zahl|null>}
  ],
  "optimierungen": ["<Vorschlag 1>", "<Vorschlag 2>"],
  "fazit": "<2-3 Sätze abschließendes Fazit inkl. Hinweis dass dies keine Anlageberatung ist>"
}

Wichtig:
- Schätze Werte wenn nicht direkt sichtbar
- Berücksichtige den Anlagestil des Users bei Redundanzen (falls angegeben)
- Anteil-Werte sind immer Zahlen (z.B. 59.7 nicht "59.7%")
"""


@router.post("/portfolio/analyze")
async def analyze_portfolio(
    images: List[UploadFile] = File(...),
    investment_style: Optional[str] = Form(default=""),
):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")
    if not images:
        raise HTTPException(status_code=400, detail="Mindestens ein Screenshot erforderlich.")
    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximal 5 Screenshots erlaubt.")

    try:
        # Build message content: images first, then text prompt
        content = []

        for img in images:
            data = await img.read()
            mime = img.content_type or "image/jpeg"
            b64 = base64.b64encode(data).decode("utf-8")
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64}"}
            })

        prompt = SYSTEM_PROMPT
        if investment_style and investment_style.strip():
            prompt += f"\n\n**Anlagestil des Users:** {investment_style.strip()}"
        else:
            prompt += "\n\n**Anlagestil des Users:** Keine Angabe."

        content.append({"type": "text", "text": prompt})

        payload = {
            "model": MODEL,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": 2048,
            "temperature": 0.4,
        }

        resp = http.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )

        if not resp.ok:
            raise HTTPException(status_code=502, detail=f"Analyse fehlgeschlagen: {resp.text}")

        raw = resp.json()["choices"][0]["message"]["content"]

        # Strip markdown code fences if model added them
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()

        try:
            structured = json.loads(cleaned)
            return {"analysis": structured, "raw": None}
        except Exception:
            # Fallback: return raw text so frontend can still show something
            return {"analysis": None, "raw": raw}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analyse fehlgeschlagen: {str(e)}")
