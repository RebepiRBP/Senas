import os
import json
import shutil
import zipfile
import pickle
import tempfile
from typing import Dict, Any, Optional
import tensorflow as tf
from pathlib import Path
from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.model import Model
from app.models.dataset import Dataset
from app.models.user import User

class ModelManager:
    def __init__(self):
        self.models_dir = Path(settings.MODEL_DIR)
        self.models_dir.mkdir(exist_ok=True)

    async def save_model(self, model_id: str, model: tf.keras.Model, metadata: Dict[str, Any]) -> bool:
        try:
            model_path = self.models_dir / model_id
            model_path.mkdir(exist_ok=True)

            model.save(model_path / "model.h5")

            with open(model_path / "metadata.json", "w", encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            return True
        except Exception as e:
            print(f"Error saving model {model_id}: {str(e)}")
            return False

    async def load_model(self, model_id: str) -> Optional[tf.keras.Model]:
        try:
            model_path = self.models_dir / model_id / "model.h5"
            if model_path.exists():
                return tf.keras.models.load_model(model_path)
            return None
        except Exception as e:
            print(f"Error loading model {model_id}: {str(e)}")
            return None

    async def get_model_metadata(self, model_id: str) -> Optional[Dict[str, Any]]:
        try:
            metadata_path = self.models_dir / model_id / "metadata.json"
            if metadata_path.exists():
                with open(metadata_path, "r", encoding='utf-8') as f:
                    return json.load(f)
            return None
        except Exception as e:
            print(f"Error loading metadata for model {model_id}: {str(e)}")
            return None

    async def delete_model_files(self, model_id: str) -> bool:
        try:
            model_path = self.models_dir / model_id
            if model_path.exists():
                shutil.rmtree(model_path)
            return True
        except Exception as e:
            print(f"Error deleting model {model_id}: {str(e)}")
            return False

    async def export_model(self, model_id: str, export_format: str = "tfjs") -> Optional[str]:
        try:
            model_path = self.models_dir / model_id
            if not model_path.exists():
                print(f"Model directory not found: {model_path}")
                return None
           
            model_file = model_path / "model.h5"
            if not model_file.exists():
                print(f"Model file not found: {model_file}")
                return None

            temp_dir = tempfile.mkdtemp()
            zip_path = os.path.join(temp_dir, f"{model_id}_{export_format}.zip")
           
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in model_path.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(model_path)
                        zipf.write(file_path, arcname)
           
            print(f"Model exported successfully to: {zip_path}")
            return zip_path

        except Exception as e:
            print(f"Error exporting model {model_id}: {str(e)}")
            return None

    async def import_model(self, zip_path: str, user_id: str, db: Session, custom_model_name: str) -> Dict[str, Any]:
        temp_extract_dir = None
        model_id = str(uuid.uuid4())
       
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                temp_extract_dir = tempfile.mkdtemp()
                zip_ref.extractall(temp_extract_dir)
           
            required_files = ["model.h5", "label_encoder.json"]
            extracted_files = os.listdir(temp_extract_dir)
           
            missing_files = [f for f in required_files if f not in extracted_files]
            if missing_files:
                return {
                    "success": False,
                    "error": f"Missing required files in ZIP: {missing_files}"
                }
           
            label_encoder_path = os.path.join(temp_extract_dir, "label_encoder.json")
            with open(label_encoder_path, 'r', encoding='utf-8') as f:
                label_data = json.load(f)
           
            labels = label_data.get("original_labels", label_data.get("labels", []))
            labels = [lbl for lbl in labels if lbl != "NO_GESTURE"]
           
            if not labels:
                return {
                    "success": False,
                    "error": "No valid labels found in model"
                }
           
            model_name = custom_model_name.strip()
            description = f"Modelo importado: {custom_model_name}"
           
            metadata_path = os.path.join(temp_extract_dir, "metadata.json")
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    original_description = metadata.get("description", "")
                    if original_description:
                        description = f"{custom_model_name} - {original_description}"
           
            model_type = "standard"
            categories = ["personalizado"]
           
            arithmetic_labels = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', 'x', '/', 'espacio', 'enter']
            if set(arithmetic_labels).issubset(set(labels)):
                model_type = "arithmetic"
                categories = ["operaciones"]
           
            accuracy = 0.85
            metrics_path = os.path.join(temp_extract_dir, "metrics.json")
            if os.path.exists(metrics_path):
                with open(metrics_path, 'r', encoding='utf-8') as f:
                    metrics = json.load(f)
                    accuracy = metrics.get("accuracy", 0.85)
                    if accuracy > 1:
                        accuracy = accuracy / 100
           
            db_model = Model(
                id=model_id,
                name=model_name,
                description=description,
                categories=categories,
                labels=labels,
                accuracy=accuracy,
                status="ready",
                user_id=user_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_trained=datetime.utcnow(),
                type=model_type,
                version=1
            )
           
            db.add(db_model)
           
            final_model_dir = self.models_dir / model_id
            final_model_dir.mkdir(exist_ok=True)
           
            for file_name in os.listdir(temp_extract_dir):
                src_file = os.path.join(temp_extract_dir, file_name)
                dst_file = final_model_dir / file_name
                if os.path.isfile(src_file):
                    shutil.copy2(src_file, dst_file)
           
            try:
                model_test = tf.keras.models.load_model(final_model_dir / "model.h5")
                print(f"Model validation successful for {model_id}")
            except Exception as e:
                db.rollback()
                shutil.rmtree(final_model_dir, ignore_errors=True)
                return {
                    "success": False,
                    "error": f"Invalid TensorFlow model file: {str(e)}"
                }
           
            db.commit()
           
            return {
                "success": True,
                "message": f"Modelo '{model_name}' importado exitosamente",
                "model_id": model_id
            }
           
        except zipfile.BadZipFile:
            return {
                "success": False,
                "error": "El archivo no es un ZIP válido"
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Error al leer archivos JSON del modelo"
            }
        except Exception as e:
            print(f"Import error: {str(e)}")
            if 'db_model' in locals():
                try:
                    db.rollback()
                except:
                    pass
           
            if final_model_dir and final_model_dir.exists():
                shutil.rmtree(final_model_dir, ignore_errors=True)
           
            return {
                "success": False,
                "error": f"Error durante la importación: {str(e)}"
            }
        finally:
            if temp_extract_dir and os.path.exists(temp_extract_dir):
                shutil.rmtree(temp_extract_dir, ignore_errors=True)

    async def get_model_metrics(self, model_id: str) -> Optional[Dict[str, Any]]:
        try:
            metrics_path = self.models_dir / model_id / "metrics.json"
            if metrics_path.exists():
                with open(metrics_path, "r", encoding='utf-8') as f:
                    return json.load(f)
           
            default_metrics = {
                "accuracy": 0.0,
                "totalSamples": 0,
                "trainingTime": 0,
                "trainingHistory": [],
                "confusionMatrix": {},
                "classDistribution": {}
            }
           
            return default_metrics

        except Exception as e:
            print(f"Error loading metrics for model {model_id}: {str(e)}")
            return None

    async def list_model_versions(self, model_id: str) -> list[str]:
        try:
            model_path = self.models_dir / model_id
            versions = []
            if model_path.exists():
                for item in model_path.iterdir():
                    if item.name.startswith("version_"):
                        versions.append(item.name)
            return sorted(versions)
        except Exception as e:
            print(f"Error listing versions for model {model_id}: {str(e)}")
            return []