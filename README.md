# Sistema de Reconocimiento de Señas Personalizado

Un sistema completo para crear, entrenar y usar modelos de reconocimiento de señas personalizados utilizando MediaPipe y TensorFlow.

## 🚀 Características

- **Entrenamiento Personalizado**: Crea tus propios modelos desde cero
- **Múltiples Categorías**: Soporte para alfabeto, números, operaciones matemáticas y señas personalizadas
- **Interfaz Moderna**: Frontend desarrollado en React + TypeScript
- **API Robusta**: Backend en Python con FastAPI
- **Detección en Tiempo Real**: Utilizando MediaPipe Hands
- **Métricas Detalladas**: Análisis completo del rendimiento de modelos
- **Exportación**: Modelos exportables en TensorFlow.js y ONNX
- **Escalabilidad**: Diseñado para producción con Docker y Kubernetes

## 🛠️ Tecnologías

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- MediaPipe Hands
- TensorFlow.js
- Recharts para visualizaciones
- Axios para API calls

### Backend
- FastAPI
- TensorFlow
- PostgreSQL
- Redis
- Celery
- SQLAlchemy
- MinIO/S3

### DevOps
- Docker & Docker Compose
- Kubernetes ready
- CI/CD pipeline
- Monitoring con Prometheus

## 🚀 Instalación

### Requisitos Previos
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL (si no usas Docker)

### Instalación con Docker (Recomendado)

1. Clona el repositorio:
```bash
git clone <repository-url>
cd sign-recognition-system
```

2. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita .env con tus configuraciones
```

3. Inicia los servicios:
```bash
docker-compose up -d
```

4. Accede a la aplicación:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Documentación API: http://localhost:8000/docs

### Instalación Manual

#### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📚 Uso

### 1. Crear un Modelo

1. Ve a "Crear Modelo" en la interfaz
2. Completa la información del modelo:
   - Nombre descriptivo
   - Categorías (alfabeto, números, etc.)
   - Señas a reconocer
3. Ajusta el número de muestras por seña (recomendado: 25-35)

### 2. Entrenamiento

1. El sistema te guiará paso a paso
2. Realiza cada seña frente a la cámara
3. Mantén buena iluminación y fondo simple
4. Espera a que complete el entrenamiento

### 3. Detección

1. Selecciona tu modelo entrenado
2. Activa la detección en tiempo real
3. Realiza señas frente a la cámara
4. Ve los resultados con niveles de confianza

### 4. Gestión de Modelos

- Ver métricas detalladas
- Exportar modelos
- Eliminar modelos no deseados
- Versionar modelos

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React + TS    │◄──►│   FastAPI       │◄──►│   PostgreSQL    │
│   MediaPipe     │    │   TensorFlow    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                      │
         │              ┌─────────────────┐             │
         │              │     Redis       │             │
         └──────────────┤   (Cache/Queue) ├─────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │    Celery       │
                        │  (Background)   │
                        └─────────────────┘
```

## 🔧 Configuración

### Variables de Entorno Principales

- `SECRET_KEY`: Clave secreta para JWT
- `DATABASE_URL`: URL de conexión a PostgreSQL
- `REDIS_URL`: URL de conexión a Redis
- `MINIO_*`: Configuración de almacenamiento
- `DEBUG`: Modo desarrollo

### Configuración de Cámara

```typescript
const CAMERA_CONSTRAINTS = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
    facingMode: 'user'
  }
}
```

## 📊 Monitoreo

El sistema incluye métricas y logging:

- Métricas de rendimiento de modelos
- Logs estructurados
- Monitoreo de recursos
- Alertas automáticas

## 🧪 Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## 🚀 Despliegue

### Docker Swarm
```bash
docker stack deploy -c docker-compose.prod.yml signrecognition
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## 📈 Roadmap

- [ ] Soporte para más tipos de modelos ML
- [ ] Integración con WebRTC
- [ ] App móvil nativa
- [ ] Soporte multiidioma
- [ ] Reconocimiento de señas en video
- [ ] API GraphQL

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## ✨ Agradecimientos

- MediaPipe team por la detección de manos
- TensorFlow team por el framework ML
- FastAPI por el excelente framework web
- React team por la librería frontend

## 📞 Soporte

- 📧 Email: support@signrecognition.com
- 📚 Documentación: [docs.signrecognition.com](https://docs.signrecognition.com)
- 🐛 Issues: [GitHub Issues](https://github.com/yourrepo/issues)

---