import sys
import traceback

try:
    print("Testing backend.database...")
    from backend import database
    print("Testing backend.models...")
    from backend import models
    print("Testing backend.routers.agendamentos...")
    from backend.routers import agendamentos
    print("Testing main...")
    import main
    print("All good!")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {str(e)}")
    traceback.print_exc()
    sys.exit(1)
