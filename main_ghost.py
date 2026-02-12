from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os

app = FastAPI()

@app.get("/health")
async def health():
    return JSONResponse(content={"status": "alive", "port": os.getenv("PORT")}, status_code=200)

@app.get("/")
async def root():
    return {"message": "Ghost Protocol Active"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
