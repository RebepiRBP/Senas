from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DistribucionMuestras(BaseModel):
    etiqueta: str
    cantidad: int = Field(..., ge=0)
    porcentaje: float = Field(..., ge=0.0, le=100.0)

class DistribucionEtiquetas(BaseModel):
    nombre: str
    valor: int = Field(..., ge=0)

class ProgresoEntrenamiento(BaseModel):
    sesion: int = Field(..., ge=1)
    fecha: str
    precision: float = Field(..., ge=0.0, le=100.0)
    muestras: int = Field(..., ge=0)

class UsoDiario(BaseModel):
    fecha: str
    predicciones: int = Field(..., ge=0)
    precision: float = Field(..., ge=0.0, le=100.0)

class CalidadDeteccion(BaseModel):
    calidad: str = Field(..., pattern="^(excellent|good|fair|poor)$")
    cantidad: int = Field(..., ge=0)
    porcentaje: float = Field(..., ge=0.0, le=100.0)

class MetricasRendimiento(BaseModel):
    muestrasTotales: int = Field(..., ge=0)
    precisionPromedio: float = Field(..., ge=0.0, le=100.0)
    mejorPrecision: float = Field(..., ge=0.0, le=100.0)
    tiempoEntrenamiento: int = Field(..., ge=0)
    ultimoUso: str
    prediccionesTotales: int = Field(..., ge=0)

class ModelStatisticsResponse(BaseModel):
    samplesPerLabel: List[DistribucionMuestras]
    trainingProgress: List[ProgresoEntrenamiento]
    labelDistribution: List[DistribucionEtiquetas]
    dailyUsage: List[UsoDiario]
    performanceMetrics: MetricasRendimiento
    detectionQuality: List[CalidadDeteccion]