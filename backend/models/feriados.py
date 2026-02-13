from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime
from datetime import datetime
from backend.database import Base

class Feriado(Base):
    __tablename__ = "feriados"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False, unique=True, index=True)
    descricao = Column(String(200), nullable=False)
    fixo = Column(Boolean, default=False) # Se repete todo ano (implementação futura)
    data_criacao = Column(DateTime, default=datetime.utcnow)
