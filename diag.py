print("Importing database...")
from backend.database import engine, SessionLocal
print("Importing models...")
from backend.models import Agendamento, Empresa, CronogramaEvento, StatusAgendamento
print("Importing agendamentos router...")
from backend.routers import agendamentos
print("Importing main...")
import main
print("All imports successful")
