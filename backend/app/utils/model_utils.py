import tensorflow as tf
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.metrics import classification_report, confusion_matrix
import json
import os

class ModelUtils:
    
    @staticmethod
    def create_neural_network(input_dim: int, num_classes: int, architecture: str = "default") -> tf.keras.Model:
        if architecture == "simple":
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu', input_shape=(input_dim,)),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(num_classes, activation='softmax')
            ])
        elif architecture == "deep":
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(256, activation='relu', input_shape=(input_dim,)),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(128, activation='relu'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(num_classes, activation='softmax')
            ])
        else:  # default
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(128, activation='relu', input_shape=(input_dim,)),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(num_classes, activation='softmax')
            ])
        
        return model
    
    @staticmethod
    def compile_model(model: tf.keras.Model, learning_rate: float = 0.001) -> tf.keras.Model:
        optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
        
        model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    @staticmethod
    def create_callbacks(model_path: str, patience: int = 10) -> List[tf.keras.callbacks.Callback]:
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=patience,
                restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=0.0001
            ),
            tf.keras.callbacks.ModelCheckpoint(
                filepath=os.path.join(model_path, 'best_model.h5'),
                monitor='val_accuracy',
                save_best_only=True,
                save_weights_only=False
            )
        ]
        
        return callbacks
    
    @staticmethod
    def evaluate_model(model: tf.keras.Model, X_test: np.ndarray, y_test: np.ndarray, 
                      class_names: List[str]) -> Dict[str, Any]:
        predictions = model.predict(X_test)
        predicted_classes = np.argmax(predictions, axis=1)
        
        # Classification report
        report = classification_report(y_test, predicted_classes, 
                                     target_names=class_names, output_dict=True)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, predicted_classes)
        
        # Calculate metrics per class
        confusion_dict = {}
        for i, class_name in enumerate(class_names):
            if class_name in report:
                confusion_dict[class_name] = {
                    "precision": float(report[class_name]["precision"]),
                    "recall": float(report[class_name]["recall"]),
                    "f1Score": float(report[class_name]["f1-score"]),
                    "support": int(report[class_name]["support"])
                }
        
        # Class distribution
        class_distribution = {}
        for i, class_name in enumerate(class_names):
            class_distribution[class_name] = int(np.sum(y_test == i))
        
        return {
            "accuracy": float(report["accuracy"]),
            "confusionMatrix": confusion_dict,
            "classDistribution": class_distribution,
            "totalSamples": len(y_test)
        }
    
    @staticmethod
    def save_model_config(config: Dict[str, Any], filepath: str) -> bool:
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump(config, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving model config: {str(e)}")
            return False
    
    @staticmethod
    def load_model_config(filepath: str) -> Dict[str, Any]:
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading model config: {str(e)}")
            return {}
    
    @staticmethod
    def optimize_model_for_inference(model: tf.keras.Model) -> tf.keras.Model:
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        tflite_model = converter.convert()
        return tflite_model
    
    @staticmethod
    def calculate_model_size(model_path: str) -> int:
        try:
            return os.path.getsize(model_path)
        except:
            return 0
    
    @staticmethod
    def validate_model_architecture(model: tf.keras.Model, expected_input_shape: Tuple, 
                                  expected_output_classes: int) -> bool:
        try:
            if model.input_shape[1:] != expected_input_shape:
                return False
            
            if model.output_shape[-1] != expected_output_classes:
                return False
            
            return True
        except:
            return Falseimport tensorflow as tf
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.metrics import classification_report, confusion_matrix
import json
import os

class ModelUtils:
    
    @staticmethod
    def create_neural_network(input_dim: int, num_classes: int, architecture: str = "default") -> tf.keras.Model:
        if architecture == "simple":
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu', input_shape=(input_dim,)),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(num_classes, activation='softmax')
            ])
        elif architecture == "deep":
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(256, activation='relu', input_shape=(input_dim,)),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(128, activation='relu'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(num_classes, activation='softmax')
            ])
        else:  # default
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(128, activation='relu', input_shape=(input_dim,)),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(num_classes, activation='softmax')
            ])
        
        return model
    
    @staticmethod
    def compile_model(model: tf.keras.Model, learning_rate: float = 0.001) -> tf.keras.Model:
        optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
        
        model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    @staticmethod
    def create_callbacks(model_path: str, patience: int = 10) -> List[tf.keras.callbacks.Callback]:
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=patience,
                restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=0.0001
            ),
            tf.keras.callbacks.ModelCheckpoint(
                filepath=os.path.join(model_path, 'best_model.h5'),
                monitor='val_accuracy',
                save_best_only=True,
                save_weights_only=False
            )
        ]
        
        return callbacks
    
    @staticmethod
    def evaluate_model(model: tf.keras.Model, X_test: np.ndarray, y_test: np.ndarray, 
                      class_names: List[str]) -> Dict[str, Any]:
        predictions = model.predict(X_test)
        predicted_classes = np.argmax(predictions, axis=1)
        
        # Classification report
        report = classification_report(y_test, predicted_classes, 
                                     target_names=class_names, output_dict=True)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, predicted_classes)
        
        # Calculate metrics per class
        confusion_dict = {}
        for i, class_name in enumerate(class_names):
            if class_name in report:
                confusion_dict[class_name] = {
                    "precision": float(report[class_name]["precision"]),
                    "recall": float(report[class_name]["recall"]),
                    "f1Score": float(report[class_name]["f1-score"]),
                    "support": int(report[class_name]["support"])
                }
        
        # Class distribution
        class_distribution = {}
        for i, class_name in enumerate(class_names):
            class_distribution[class_name] = int(np.sum(y_test == i))
        
        return {
            "accuracy": float(report["accuracy"]),
            "confusionMatrix": confusion_dict,
            "classDistribution": class_distribution,
            "totalSamples": len(y_test)
        }
    
    @staticmethod
    def save_model_config(config: Dict[str, Any], filepath: str) -> bool:
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump(config, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving model config: {str(e)}")
            return False
    
    @staticmethod
    def load_model_config(filepath: str) -> Dict[str, Any]:
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading model config: {str(e)}")
            return {}
    
    @staticmethod
    def optimize_model_for_inference(model: tf.keras.Model) -> tf.keras.Model:
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        tflite_model = converter.convert()
        return tflite_model
    
    @staticmethod
    def calculate_model_size(model_path: str) -> int:
        try:
            return os.path.getsize(model_path)
        except:
            return 0
    
    @staticmethod
    def validate_model_architecture(model: tf.keras.Model, expected_input_shape: Tuple, 
                                  expected_output_classes: int) -> bool:
        try:
            if model.input_shape[1:] != expected_input_shape:
                return False
            
            if model.output_shape[-1] != expected_output_classes:
                return False
            
            return True
        except:
            return False