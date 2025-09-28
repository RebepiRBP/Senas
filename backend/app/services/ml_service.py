import tensorflow as tf
import numpy as np
import json
import os
import traceback
import shutil
import tempfile
import pickle
from typing import List, Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report
from app.core.config import settings

class MLService:
    def __init__(self):
        self.models = {}
        self.label_encoders = {}
        self.scalers = {}
        self.gesture_validators = {}

    def _get_safe_model_path(self, model_id: str) -> str:
        model_dir = os.path.join(settings.MODEL_DIR, model_id)
        model_dir = os.path.normpath(model_dir)
        return model_dir

    def _copy_to_temp_and_load(self, model_path: str):
        try:
            with tempfile.NamedTemporaryFile(suffix='.h5', delete=False) as temp_file:
                temp_path = temp_file.name
               
            shutil.copy2(model_path, temp_path)
            model = tf.keras.models.load_model(temp_path)
           
            try:
                os.unlink(temp_path)
            except:
                pass
               
            return model
        except Exception as e:
            try:
                os.unlink(temp_path)
            except:
                pass
            raise e

    async def train_model(self, model_id: str, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        try:
            print(f"=== TRAINING START ===")
            print(f"Model ID: {model_id}")
            print(f"Training data count: {len(training_data)}")
           
            if not training_data:
                raise ValueError("No training data provided")

            X, y, labels = self._prepare_training_data(training_data)
            print(f"Prepared data - Samples: {len(X)}, Classes: {len(labels)}")
           
            if len(X) == 0:
                raise ValueError("No valid training samples after processing")
            if len(set(y)) < 2:
                raise ValueError(f"Need at least 2 different classes, got: {set(y)}")

            X_negative = self._generate_negative_samples(X, len(X) // 3)
            y_negative = ['NO_GESTURE'] * len(X_negative)
           
            X_combined = np.vstack([X, X_negative])
            y_combined = np.hstack([y, y_negative])
            labels_with_negative = labels + ['NO_GESTURE']
           
            label_encoder = LabelEncoder()
            y_encoded = label_encoder.fit_transform(y_combined)
           
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_combined)
           
            gesture_validator = self._create_gesture_validator(X, y, labels)

            if len(np.unique(y_encoded)) >= 2 and len(X_scaled) > 10:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y_encoded, test_size=0.2, random_state=42,
                    stratify=y_encoded
                )
            else:
                X_train, X_test, y_train, y_test = X_scaled, np.array([]), y_encoded, np.array([])

            model = self._create_model(X_train.shape[1], len(labels_with_negative))
           
            epochs = min(150, max(30, len(X) // 2))
            batch_size = min(16, max(4, len(X_train) // 10))
           
            class_weights = self._calculate_class_weights(y_train)
           
            callbacks = [
                tf.keras.callbacks.EarlyStopping(
                    monitor='val_loss' if len(X_test) > 0 else 'loss',
                    patience=20,
                    restore_best_weights=True
                ),
                tf.keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss' if len(X_test) > 0 else 'loss',
                    factor=0.2,
                    patience=10,
                    min_lr=0.00001
                )
            ]
           
            history = model.fit(
                X_train, y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_data=(X_test, y_test) if len(X_test) > 0 else None,
                callbacks=callbacks,
                class_weight=class_weights,
                verbose=1
            )

            model_dir = self._get_safe_model_path(model_id)
            os.makedirs(model_dir, exist_ok=True)
           
            try:
                with tempfile.NamedTemporaryFile(suffix='.h5', delete=False) as temp_file:
                    temp_path = temp_file.name
                   
                model.save(temp_path)
                final_model_path = os.path.join(model_dir, "model.h5")
                shutil.move(temp_path, final_model_path)
                print(f"Model saved successfully to {final_model_path}")
            except Exception as e:
                print(f"Error saving model: {e}")
                raise
           
            try:
                with open(os.path.join(model_dir, "scaler.pkl"), "wb") as f:
                    pickle.dump(scaler, f)
                print(f"Scaler saved successfully")
            except Exception as e:
                print(f"Error saving scaler: {e}")
           
            try:
                with open(os.path.join(model_dir, "validator.pkl"), "wb") as f:
                    pickle.dump(gesture_validator, f)
                print(f"Validator saved successfully")
            except Exception as e:
                print(f"Error saving validator: {e}")

            try:
                with open(os.path.join(model_dir, "label_encoder.pkl"), "wb") as f:
                    pickle.dump(label_encoder, f)
                print(f"Label encoder pickle saved successfully")
            except Exception as e:
                print(f"Error saving label encoder pickle: {e}")
           
            label_data = {
                "classes": [str(cls) for cls in label_encoder.classes_.tolist()],
                "labels": [str(lbl) for lbl in labels_with_negative],
                "original_labels": [str(lbl) for lbl in labels],
                "input_shape": int(X_train.shape[1]),
                "class_mapping": {str(cls): int(idx) for idx, cls in enumerate(label_encoder.classes_)}
            }
           
            try:
                with open(os.path.join(model_dir, "label_encoder.json"), "w", encoding='utf-8') as f:
                    json.dump(label_data, f, ensure_ascii=False, indent=2)
                print(f"Label encoder JSON saved successfully")
            except Exception as e:
                print(f"Error saving label encoder JSON: {e}")
                raise

            if len(X_test) > 0:
                y_pred = model.predict(X_test)
                y_pred_classes = np.argmax(y_pred, axis=1)
                metrics = self._calculate_metrics(y_test, y_pred_classes, labels_with_negative, history)
            else:
                metrics = {
                    "accuracy": float(history.history["accuracy"][-1]),
                    "totalSamples": len(y_train),
                    "trainingTime": 0,
                    "trainingHistory": [],
                    "confusionMatrix": {},
                    "classDistribution": {}
                }

            try:
                with open(os.path.join(model_dir, "metrics.json"), "w", encoding='utf-8') as f:
                    json.dump(metrics, f, ensure_ascii=False, indent=2)
                print(f"Metrics saved successfully")
            except Exception as e:
                print(f"Error saving metrics: {e}")

            self.models[model_id] = model
            self.label_encoders[model_id] = label_encoder
            self.scalers[model_id] = scaler
            self.gesture_validators[model_id] = gesture_validator

            print(f"=== TRAINING COMPLETE ===")
            print(f"Final accuracy: {metrics['accuracy']}")
            return metrics

        except Exception as e:
            print(f"=== TRAINING ERROR ===")
            print(f"Error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            raise Exception(f"Error training model: {str(e)}")

    async def predict(self, model_id: str, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if model_id in self.models and model_id in self.label_encoders and model_id in self.scalers:
                model = self.models[model_id]
                label_encoder = self.label_encoders[model_id]
                scaler = self.scalers[model_id]
                validator = self.gesture_validators.get(model_id)
                class_names = label_encoder.classes_.tolist()
                print(f"Using cached model components for {model_id}")
            else:
                print(f"Loading model components from disk for {model_id}")
                model_dir = self._get_safe_model_path(model_id)
               
                if not os.path.exists(model_dir):
                    raise Exception(f"Model directory not found: {model_dir}")
               
                print(f"Model directory exists: {model_dir}")
                print(f"Directory contents: {os.listdir(model_dir)}")
               
                model_path = os.path.join(model_dir, "model.h5")
                if not os.path.exists(model_path):
                    raise Exception(f"Model file not found: {model_path}")

                try:
                    print(f"Loading TensorFlow model from: {model_path}")
                    model = self._copy_to_temp_and_load(model_path)
                    print(f"Model loaded successfully")
                except Exception as e:
                    print(f"Error loading TensorFlow model: {e}")
                    raise Exception(f"Failed to load model: {e}")
               
                label_encoder = None
                class_names = []
               
                label_encoder_pkl_path = os.path.join(model_dir, "label_encoder.pkl")
                if os.path.exists(label_encoder_pkl_path):
                    try:
                        print(f"Loading label encoder from pickle: {label_encoder_pkl_path}")
                        with open(label_encoder_pkl_path, "rb") as f:
                            label_encoder = pickle.load(f)
                        class_names = label_encoder.classes_.tolist()
                        print(f"Label encoder loaded from pickle. Classes: {class_names}")
                    except Exception as e:
                        print(f"Error loading label encoder from pickle: {e}")
                        label_encoder = None
               
                if label_encoder is None:
                    label_encoder_json_path = os.path.join(model_dir, "label_encoder.json")
                    if not os.path.exists(label_encoder_json_path):
                        raise Exception(f"No label encoder found at: {label_encoder_json_path}")
                   
                    try:
                        print(f"Loading label encoder from JSON: {label_encoder_json_path}")
                        with open(label_encoder_json_path, "r", encoding='utf-8') as f:
                            label_data = json.load(f)
                       
                        class_names = label_data["classes"]
                       
                        label_encoder = LabelEncoder()
                        label_encoder.classes_ = np.array(class_names)
                       
                        print(f"Label encoder reconstructed from JSON. Classes: {class_names}")
                    except Exception as e:
                        print(f"Error loading label encoder from JSON: {e}")
                        raise Exception(f"Failed to load label encoder: {e}")
               
                scaler = None
                scaler_path = os.path.join(model_dir, "scaler.pkl")
                print(f"Checking for scaler at: {scaler_path}")
                if os.path.exists(scaler_path):
                    try:
                        print(f"Loading scaler from pickle file")
                        with open(scaler_path, "rb") as f:
                            scaler = pickle.load(f)
                        print(f"Scaler loaded successfully")
                    except Exception as e:
                        print(f"Error loading scaler from pickle: {e}")
                        scaler = self._create_default_scaler()
                else:
                    print(f"Scaler file not found, creating new one")
                    scaler = self._create_default_scaler()

                validator = None
                validator_path = os.path.join(model_dir, "validator.pkl")
                print(f"Checking for validator at: {validator_path}")
                if os.path.exists(validator_path):
                    try:
                        print(f"Loading validator from pickle file")
                        with open(validator_path, "rb") as f:
                            validator = pickle.load(f)
                        print(f"Validator loaded successfully")
                    except Exception as e:
                        print(f"Error loading validator: {e}")
                        validator = None
               
                self.models[model_id] = model
                self.label_encoders[model_id] = label_encoder
                self.scalers[model_id] = scaler
                self.gesture_validators[model_id] = validator

            landmarks = prediction_data.get("landmarks")
            if not landmarks:
                raise ValueError("No landmarks provided")
           
            if not isinstance(landmarks, list) or len(landmarks) != 21:
                raise ValueError(f"Expected 21 landmarks, got {len(landmarks) if isinstance(landmarks, list) else 'invalid type'}")

            if not self._is_valid_hand_pose(landmarks):
                return {
                    "prediction": "Mano no detectada correctamente",
                    "confidence": 0.0,
                    "probabilities": {}
                }

            try:
                features = self._extract_features_fixed(landmarks)
                features_array = np.array([features]).astype(np.float32)
                print(f"Features extracted successfully. Shape: {features_array.shape}")
            except Exception as e:
                print(f"Error extracting features: {e}")
                raise Exception(f"Feature extraction failed: {e}")
           
            try:
                if hasattr(scaler, 'scale_') and scaler.scale_ is not None and len(scaler.scale_) == features_array.shape[1]:
                    features_scaled = scaler.transform(features_array)
                    print(f"Features scaled using fitted scaler")
                else:
                    features_scaled = features_array
                    print(f"Using raw features (scaler not compatible)")
            except Exception as e:
                print(f"Error scaling features: {e}")
                features_scaled = features_array

            try:
                predictions = model.predict(features_scaled, verbose=0)
                print(f"Model prediction completed. Shape: {predictions.shape}")
                print(f"All class predictions: {dict(zip(class_names, predictions[0]))}")
            except Exception as e:
                print(f"Error during model prediction: {e}")
                raise Exception(f"Model prediction failed: {e}")
           
            max_confidence = np.max(predictions[0])
            predicted_class = np.argmax(predictions[0])
            predicted_label = class_names[predicted_class]
           
            print(f"Predicted class index: {predicted_class}")
            print(f"Predicted label: {predicted_label}")
            print(f"Max confidence: {max_confidence}")
           
            confidence_threshold = 0.5
            entropy_threshold = self._calculate_entropy_threshold(predictions[0])
           
            if (max_confidence < confidence_threshold or
                entropy_threshold > 2.5 or
                predicted_label == "NO_GESTURE"):
               
                return {
                    "prediction": "No se detecta seña clara",
                    "confidence": float(max_confidence),
                    "probabilities": {
                        label: float(prob) for label, prob in zip(class_names, predictions[0])
                        if label != "NO_GESTURE"
                    }
                }
           
            confidence = float(predictions[0][predicted_class])
           
            filtered_probabilities = {
                label: float(prob) for label, prob in zip(class_names, predictions[0])
                if label != "NO_GESTURE"
            }
           
            total_prob = sum(filtered_probabilities.values())
            if total_prob > 0:
                filtered_probabilities = {
                    label: prob / total_prob for label, prob in filtered_probabilities.items()
                }

            print(f"Prediction successful: {predicted_label} ({confidence:.3f})")
            return {
                "prediction": predicted_label,
                "confidence": confidence,
                "probabilities": filtered_probabilities
            }

        except Exception as e:
            print(f"Error making prediction for model {model_id}: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            raise Exception(f"Error making prediction: {str(e)}")

    def _create_default_scaler(self) -> StandardScaler:
        scaler = StandardScaler()
        scaler.mean_ = np.zeros(78)
        scaler.scale_ = np.ones(78)
        scaler.var_ = np.ones(78)
        scaler.n_samples_seen_ = 1
        return scaler

    def _extract_features_fixed(self, landmarks: List[Dict[str, float]]) -> List[float]:
        features = []
       
        if len(landmarks) != 21:
            raise ValueError(f"Expected 21 landmarks, got {len(landmarks)}")
       
        coords = [(float(lm.get("x", 0)), float(lm.get("y", 0)), float(lm.get("z", 0))) for lm in landmarks]
       
        wrist = coords[0]
        for coord in coords:
            features.extend([
                coord[0] - wrist[0],
                coord[1] - wrist[1],
                coord[2] - wrist[2]
            ])
       
        finger_tips = [4, 8, 12, 16, 20]
        finger_bases = [3, 6, 10, 14, 18]
       
        for tip, base in zip(finger_tips, finger_bases):
            tip_coord = coords[tip]
            base_coord = coords[base]
            distance = np.sqrt(
                (tip_coord[0] - base_coord[0])**2 +
                (tip_coord[1] - base_coord[1])**2 +
                (tip_coord[2] - base_coord[2])**2
            )
            features.append(distance)
       
        palm_center = coords[0]
        for tip_idx in finger_tips:
            tip_coord = coords[tip_idx]
            distance = np.sqrt(
                (tip_coord[0] - palm_center[0])**2 +
                (tip_coord[1] - palm_center[1])**2 +
                (tip_coord[2] - palm_center[2])**2
            )
            features.append(distance)
       
        angles = []
        finger_chains = [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 16],
            [17, 18, 19, 20]
        ]
       
        for chain in finger_chains:
            for i in range(len(chain) - 2):
                p1 = np.array(coords[chain[i]])
                p2 = np.array(coords[chain[i+1]])
                p3 = np.array(coords[chain[i+2]])
               
                v1 = p1 - p2
                v2 = p3 - p2
               
                cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
                cos_angle = np.clip(cos_angle, -1, 1)
                angle = np.arccos(cos_angle)
                angles.append(angle)
       
        features.extend(angles)
       
        while len(features) < 78:
            features.append(0.0)
       
        features = features[:78]
       
        return features

    def _generate_negative_samples(self, X_positive: np.ndarray, count: int) -> np.ndarray:
        negative_samples = []
       
        for _ in range(count):
            sample_type = np.random.choice(['noise', 'random_pose', 'intermediate'])
           
            if sample_type == 'noise':
                base_sample = X_positive[np.random.randint(0, len(X_positive))]
                noise = np.random.normal(0, 0.1, base_sample.shape)
                negative_sample = base_sample + noise
               
            elif sample_type == 'random_pose':
                negative_sample = np.random.uniform(-0.5, 0.5, X_positive.shape[1])
               
            else:
                idx1, idx2 = np.random.choice(len(X_positive), 2, replace=False)
                alpha = np.random.uniform(0.3, 0.7)
                negative_sample = alpha * X_positive[idx1] + (1 - alpha) * X_positive[idx2]
           
            negative_samples.append(negative_sample)
       
        return np.array(negative_samples)

    def _create_gesture_validator(self, X: np.ndarray, y: np.ndarray, labels: List[str]) -> Dict:
        validator = {
            'gesture_centroids': {},
            'gesture_std': {},
            'global_mean': np.mean(X, axis=0).tolist(),
            'global_std': np.std(X, axis=0).tolist()
        }
       
        for label in labels:
            label_mask = y == label
            if np.any(label_mask):
                label_data = X[label_mask]
                validator['gesture_centroids'][label] = np.mean(label_data, axis=0).tolist()
                validator['gesture_std'][label] = np.std(label_data, axis=0).tolist()
       
        return validator

    def _validate_gesture_pattern(self, features: np.ndarray, validator: Dict) -> bool:
        return True

    def _is_valid_hand_pose(self, landmarks: List[Dict[str, float]]) -> bool:
        try:
            coords = [(float(lm.get("x", 0)), float(lm.get("y", 0)), float(lm.get("z", 0))) for lm in landmarks]
           
            for coord in coords:
                if not (-2.0 <= coord[0] <= 3.0 and -2.0 <= coord[1] <= 3.0 and -2.0 <= coord[2] <= 2.0):
                    continue
           
            wrist = coords[0]
            fingertips = [coords[4], coords[8], coords[12], coords[16], coords[20]]
           
            valid_fingertips = 0
            for tip in fingertips:
                dist = np.sqrt((tip[0] - wrist[0])**2 + (tip[1] - wrist[1])**2 + (tip[2] - wrist[2])**2)
                if 0.01 < dist < 1.0:
                    valid_fingertips += 1
           
            return valid_fingertips >= 2
           
        except Exception:
            return True

    def _calculate_entropy_threshold(self, probabilities: np.ndarray) -> float:
        probabilities = probabilities + 1e-10
        entropy = -np.sum(probabilities * np.log(probabilities))
        return entropy

    def _calculate_class_weights(self, y_train: np.ndarray) -> Dict[int, float]:
        from collections import Counter
        class_counts = Counter(y_train)
        total_samples = len(y_train)
        num_classes = len(class_counts)
       
        class_weights = {}
        for class_id, count in class_counts.items():
            weight = total_samples / (num_classes * count)
            class_weights[class_id] = weight
       
        return class_weights

    def _prepare_training_data(self, training_data: List[Dict[str, Any]]):
        X = []
        y = []
        labels = list(set([sample["label"] for sample in training_data]))
       
        label_counts = {label: 0 for label in labels}
       
        for sample in training_data:
            label_counts[sample["label"]] += 1
       
        print(f"Label distribution: {label_counts}")
       
        for i, sample in enumerate(training_data):
            try:
                landmarks = sample["landmarks"]
                if not landmarks or not isinstance(landmarks, list) or len(landmarks) != 21:
                    continue
               
                valid_landmarks = True
                for landmark in landmarks:
                    if not isinstance(landmark, dict) or not all(key in landmark for key in ['x', 'y', 'z']):
                        valid_landmarks = False
                        break
               
                if not valid_landmarks:
                    continue
               
                features = self._extract_features_fixed(landmarks)
                X.append(features)
                y.append(sample["label"])
               
            except Exception as e:
                print(f"Error processing sample {i}: {e}")
                continue

        print(f"Successfully processed {len(X)} valid samples")
        return np.array(X), np.array(y), labels

    def _create_model(self, input_dim: int, num_classes: int) -> tf.keras.Model:
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(512, activation='relu', input_shape=(input_dim,)),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.4),
           
            tf.keras.layers.Dense(256, activation='relu'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.3),
           
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.2),
           
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.1),
           
            tf.keras.layers.Dense(num_classes, activation='softmax')
        ])
       
        optimizer = tf.keras.optimizers.Adam(learning_rate=0.0005)
       
        model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
       
        return model

    def _calculate_metrics(self, y_true, y_pred, labels, history) -> Dict[str, Any]:
        try:
            report = classification_report(y_true, y_pred, target_names=labels, output_dict=True, zero_division=0)
           
            metrics = {
                "accuracy": float(report["accuracy"]),
                "totalSamples": len(y_true),
                "trainingTime": 0,
                "trainingHistory": [
                    {
                        "epoch": i + 1,
                        "accuracy": float(history.history["accuracy"][i]),
                        "loss": float(history.history["loss"][i]),
                        "valAccuracy": float(history.history.get("val_accuracy", [0])[i]) if history.history.get("val_accuracy") else 0,
                        "valLoss": float(history.history.get("val_loss", [0])[i]) if history.history.get("val_loss") else 0
                    }
                    for i in range(len(history.history["accuracy"]))
                ],
                "confusionMatrix": {},
                "classDistribution": {}
            }

            for i, label in enumerate(labels):
                if label in report and label != "NO_GESTURE":
                    metrics["confusionMatrix"][label] = {
                        "precision": float(report[label]["precision"]),
                        "recall": float(report[label]["recall"]),
                        "f1Score": float(report[label]["f1-score"]),
                        "support": int(report[label]["support"])
                    }

                if label != "NO_GESTURE":
                    metrics["classDistribution"][label] = int(np.sum(y_true == i))

            return metrics

        except Exception as e:
            print(f"Error calculating metrics: {str(e)}")
            return {
                "accuracy": 0.0,
                "totalSamples": len(y_true),
                "trainingTime": 0,
                "trainingHistory": [],
                "confusionMatrix": {},
                "classDistribution": {}
            }