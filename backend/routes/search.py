from fastapi import APIRouter, Query, HTTPException
from services.yahoo import search_assets

router = APIRouter()


@router.get("/search")
async def search(q: str = Query(..., min_length=1, max_length=100)):
    try:
        results = search_assets(q)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Search failed: {str(e)}")
