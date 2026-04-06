import os
import base64
import google.generativeai as genai
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

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
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    if not images:
        raise HTTPException(status_code=400, detail="Mindestens ein Screenshot erforderlich.")
    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximal 5 Screenshots erlaubt.")

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        parts = []

        # Add images
        for img in images:
            content = await img.read()
            mime = img.content_type or "image/jpeg"
            parts.append({
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(content).decode("utf-8"),
                }
            })

        # Build prompt
        user_prompt = SYSTEM_PROMPT
        if investment_style and investment_style.strip():
            user_prompt += f"\n\n**Anlagestil des Users:** {investment_style.strip()}"
        else:
            user_prompt += "\n\n**Anlagestil des Users:** Keine Angabe."

        parts.append({"text": user_prompt})

        response = model.generate_content(parts)
        result = response.text

        return {"analysis": result}

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analyse fehlgeschlagen: {str(e)}")
