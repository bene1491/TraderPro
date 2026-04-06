import os
import base64
import requests as http
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional

router = APIRouter()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
MODEL = "pixtral-12b-2409"

SYSTEM_PROMPT = """Du bist ein erfahrener, unabhängiger Finanzanalyst. Du analysierst Portfolio-Screenshots eines Privatanlegers.

Deine Analyse soll folgende Punkte strukturiert abdecken:

1. **Portfolio-Übersicht** — Erkenne alle Positionen und schätze die prozentuale Gewichtung jeder Position am Gesamtdepot.

2. **Diversifikation** — Bewerte die Streuung nach Anlageklassen, Regionen und Sektoren. Wie gut ist das Portfolio diversifiziert?

3. **Redundanzen** — Identifiziere Überschneidungen (z.B. ETFs die denselben Index teilweise abbilden). Erkläre konkret welche Positionen sich überlappen und zu wie viel Prozent (falls schätzbar).

4. **Stärken** — Was macht dieses Portfolio gut?

5. **Optimierungspotenziale** — Konkrete, umsetzbare Vorschläge zur Verbesserung. Beziehe den Anlagestil des Users mit ein (falls angegeben).

6. **Gesamtbewertung** — Kurzes abschließendes Fazit mit einer Einschätzung (z.B. "solides Basis-Portfolio", "stark tech-lastig", etc.)

Wichtige Hinweise:
- Formuliere klar und verständlich, nicht zu technisch
- Gib keine Anlageberatung im rechtlichen Sinne — weise am Ende kurz darauf hin
- Falls der Anlagestil des Users angegeben ist, berücksichtige ihn bei der Bewertung von Redundanzen
"""


@router.post("/portfolio/analyze")
async def analyze_portfolio(
    images: List[UploadFile] = File(...),
    investment_style: Optional[str] = Form(default=""),
):
    if not MISTRAL_API_KEY:
        raise HTTPException(status_code=500, detail="Mistral API key not configured.")
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
            MISTRAL_URL,
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )

        if not resp.ok:
            raise HTTPException(status_code=502, detail=f"Analyse fehlgeschlagen: {resp.text}")

        result = resp.json()["choices"][0]["message"]["content"]
        return {"analysis": result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analyse fehlgeschlagen: {str(e)}")
