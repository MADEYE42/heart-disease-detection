from flask import Flask, request, jsonify, send_from_directory
import os
import json
import cv2
import numpy as np
from segmentation import load_json_and_image, draw_segmentation
from prediction import predict_single_image, load_model
from PIL import Image
import torch
from flask_cors import CORS
import logging
from time import time
import gc  # For garbage collection
import uuid

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Flask app
app = Flask(__name__)

# Enable CORS with more specific configuration
CORS(app, 
     resources={r"/*": {"origins": "*"}},
     supports_credentials=False,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "OPTIONS"])

# Directory for file uploads and results
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Constants for image processing
MAX_IMAGE_DIMENSION = 1024  # Maximum image dimension for processing

# Global variables for model
model = None

# Load the model
def initialize_model():
    global model
    try:
        MODEL_PATH = os.environ.get("MODEL_PATH", "model_path.pth")
        device = torch.device("cpu")
        logging.info(f"Loading model on device: {device}")
        model = load_model(MODEL_PATH, num_classes=10, device=device)
        logging.info("Model loaded successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to load model: {str(e)}")
        return False

# Function to resize large images
def resize_image_if_needed(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None:
            logging.error(f"Failed to read image: {image_path}")
            return None
            
        h, w = img.shape[:2]
        original_size = f"{w}x{h}"
        
        # Only resize if the image is larger than MAX_IMAGE_DIMENSION
        if max(h, w) > MAX_IMAGE_DIMENSION:
            scale = MAX_IMAGE_DIMENSION / max(h, w)
            new_h, new_w = int(h * scale), int(w * scale)
            logging.info(f"Resizing image from {original_size} to {new_w}x{new_h}")
            img = cv2.resize(img, (new_w, new_h))
            cv2.imwrite(image_path, img)  # Save resized image
            
        return img
    except Exception as e:
        logging.error(f"Error resizing image: {str(e)}")
        return None

# Clean up memory
def cleanup_memory():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()

# Explicitly set CORS headers for all responses
@app.after_request
def after_request(response):
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.set('Access-Control-Max-Age', '3600')  # Cache preflight requests for 1 hour
    return response

# Route for health check
@app.route('/', methods=['GET'])
def root():
    response = jsonify({"status": "service is running"})
    return response

@app.route('/health', methods=['GET'])
def health_check():
    global model
    if model is None:
        success = initialize_model()
        if success:
            return jsonify({"status": "healthy", "model": "loaded"})
        else:
            return jsonify({"status": "unhealthy", "model": "failed to load"}), 500
    return jsonify({"status": "healthy", "model": "already loaded"})

# Route for uploading image and JSON files
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_files():
    start_time = time()
    
    # Handle preflight OPTIONS requests explicitly
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        logging.info(f"OPTIONS /upload processed in {time() - start_time:.3f} seconds")
        return response
        
    try:
        # Check if model is loaded and load if needed
        global model
        if model is None:
            success = initialize_model()
            if not success:
                response = jsonify({'error': 'Failed to load model. Please check server logs.'}), 503
                logging.info(f"POST /upload rejected (model loading failed) in {time() - start_time:.3f} seconds")
                return response
        
        # Check if files are included
        if 'image' not in request.files or 'json' not in request.files:
            response = jsonify({'error': 'No image or JSON file part in the request'}), 400
            logging.info(f"POST /upload failed (missing files) in {time() - start_time:.3f} seconds")
            return response
        
        image_file = request.files['image']
        json_file = request.files['json']
        
        if image_file.filename == '' or json_file.filename == '':
            response = jsonify({'error': 'No file selected'}), 400
            logging.info(f"POST /upload failed (empty filename) in {time() - start_time:.3f} seconds")
            return response

        # Generate unique filenames to avoid conflicts
        unique_id = str(uuid.uuid4())
        image_filename = f"{unique_id}_{image_file.filename}"
        json_filename = f"{unique_id}_{json_file.filename}"
        
        # Save the uploaded files
        image_path = os.path.join(UPLOAD_FOLDER, image_filename)
        json_path = os.path.join(UPLOAD_FOLDER, json_filename)
        
        image_file.save(image_path)
        json_file.save(json_path)
        
        logging.info(f"Files saved: {image_path}, {json_path}")

        # Resize image if needed
        resized_image = resize_image_if_needed(image_path)
        if resized_image is None:
            response = jsonify({"error": "Failed to process image"}), 400
            logging.info(f"POST /upload failed (image processing) in {time() - start_time:.3f} seconds")
            return response

        # Load the JSON and Image
        data, image = load_json_and_image(json_path, image_path)
        if data is None or image is None:
            response = jsonify({"error": "Failed to load files"}), 400
            logging.info(f"POST /upload failed (file loading) in {time() - start_time:.3f} seconds")
            return response

        # Perform Segmentation
        segmented_image = draw_segmentation(data, image)
        if segmented_image is None:
            response = jsonify({"error": "Segmentation failed"}), 500
            logging.info(f"POST /upload failed (segmentation) in {time() - start_time:.3f} seconds")
            return response

        # Save the segmented image with unique name
        segmented_image_filename = f"segmented_{unique_id}.jpg"
        segmented_image_path = os.path.join(RESULTS_FOLDER, segmented_image_filename)
        cv2.imwrite(segmented_image_path, segmented_image)
        
        logging.info(f"Segmented image saved at: {segmented_image_path}")

        # Clean up memory before prediction
        cleanup_memory()

        # Perform Prediction
        try:
            classes = ["3VT", "ARSA", "AVSD", "Dilated Cardiac Sinus", "ECIF", "HLHS", "LVOT", "Normal Heart", "TGA", "VSD"]
            predictions = predict_single_image(segmented_image_path, model, classes, torch.device("cpu"))
            
            if predictions is None:
                response = jsonify({"error": "Prediction failed"}), 500
                logging.info(f"POST /upload failed (prediction) in {time() - start_time:.3f} seconds")
                return response
                
            logging.info(f"Predictions: {predictions}")
            
            # Clean up memory after prediction
            cleanup_memory()
            
            # Return results to frontend
            response = jsonify({
                "predictions": predictions,
                "annotations": data["shapes"],
                "segmented_image": f'/results/{segmented_image_filename}'
            })
            logging.info(f"POST /upload completed in {time() - start_time:.3f} seconds")
            return response
            
        except Exception as e:
            logging.error(f"Prediction error: {str(e)}")
            response = jsonify({"error": f"Prediction error: {str(e)}"}), 500
            logging.info(f"POST /upload failed (prediction exception) in {time() - start_time:.3f} seconds")
            return response

    except Exception as e:
        logging.error(f"Error in upload process: {str(e)}")
        response = jsonify({"error": str(e)}), 500
        logging.info(f"POST /upload failed (general exception) in {time() - start_time:.3f} seconds")
        return response
    finally:
        # Always clean up memory at the end
        cleanup_memory()

# Route to serve the segmented images
@app.route('/results/<filename>')
def serve_result(filename):
    start_time = time()
    response = send_from_directory(RESULTS_FOLDER, filename)
    # Add CORS headers specifically for image results
    response.headers.set('Access-Control-Allow-Origin', '*')
    logging.info(f"GET /results/{filename} processed in {time() - start_time:.3f} seconds")
    return response

# Route to serve uploaded files (if needed)
@app.route('/uploads/<filename>')
def serve_upload(filename):
    start_time = time()
    response = send_from_directory(UPLOAD_FOLDER, filename)
    # Add CORS headers specifically for uploaded files
    response.headers.set('Access-Control-Allow-Origin', '*')
    logging.info(f"GET /uploads/{filename} processed in {time() - start_time:.3f} seconds")
    return response

# Try to initialize the model when the application starts
initialize_model()

# For local development only - not used on Render
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
