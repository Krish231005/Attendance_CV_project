import tensorflow as tf
from tensorflow.keras import layers, models

def create_face_recognition_cnn(input_shape=(160, 160, 3), num_classes=128):
    """
    This is the Python implementation of the Convolutional Neural Network (CNN) 
    architecture used for Face Recognition.
    
    The model uses a series of Convolutional layers to extract features (like edges, 
    shapes, and facial parts) and Dense layers to create a 'Face Embedding' (a 128-d vector).
    """
    
    model = models.Sequential([
        # --- Stage 1: Feature Extraction ---
        # First Convolutional Block: Detects basic edges and textures
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape, padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        
        # Second Convolutional Block: Detects more complex shapes
        layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        
        # Third Convolutional Block: Detects facial features (eyes, nose, mouth)
        layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        
        # Fourth Convolutional Block: High-level spatial features
        layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        
        # --- Stage 2: Flattening and Embedding ---
        # Flatten the 3D feature maps into a 1D vector
        layers.Flatten(),
        
        # Fully Connected Layer
        layers.Dense(512, activation='relu'),
        layers.Dropout(0.5), # Prevents overfitting
        
        # Final Embedding Layer: 
        # This produces the 128-dimensional vector that uniquely identifies a face.
        # We use L2 Normalization so that distances between vectors represent similarity.
        layers.Dense(num_classes, activation=None),
        layers.Lambda(lambda x: tf.math.l2_normalize(x, axis=1))
    ])
    
    return model

# --- Model Summary for Presentation ---
if __name__ == "__main__":
    cnn_model = create_face_recognition_cnn()
    cnn_model.summary()
    
    print("\n--- VIVA EXPLANATION ---")
    print("1. Conv2D Layers: Act as filters to extract facial features.")
    print("2. MaxPooling: Reduces spatial dimensions, making the model faster and translation invariant.")
    print("3. BatchNormalization: Stabilizes training and speeds up convergence.")
    print("4. Dense Layer (128): The final output is a 'Face Descriptor' or 'Embedding'.")
    print("5. Euclidean Distance: In the app, we compare these 128-d vectors to recognize people.")
