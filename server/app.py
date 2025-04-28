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

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all domains
CORS(app, supports_credentials=False)

# Directory for file uploads and results
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Global variables for model
model = None

# Load the model once when imported
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

# Helper function to add CORS headers to all responses
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Route for health check that also loads the model if needed
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
    # Handle preflight OPTIONS requests
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        logging.info(f"OPTIONS /upload processed in {time() - start_time:.3f} seconds")
        return add_cors_headers(response)
        
    try:
        # Check if model is loaded and load if needed
        global model
        if model is None:
            success = initialize_model()
            if not success:
                response = jsonify({'error': 'Failed to load model. Please check server logs.'}), 503
                logging.info(f"POST /upload rejected (model loading failed) in {time() - start_time:.3f} seconds")
                return add_cors_headers(response[0]), response[1]
        
        # Check if files are included
        if 'image' not in request.files or 'json' not in request.files:
            response = jsonify({'error': 'No image or JSON file part in the request'}), 400
            logging.info(f"POST /upload failed (missing files) in {time() - start_time:.3f} seconds")
            return add_cors_headers(response[0]), response[1]
        
        image_file = request.files['image']
        json_file = request.files['json']
        
        if image_file.filename == '' or json_file.filename == '':
            response = jsonify({'error': 'No file selected'}), 400
            logging.info(f"POST /upload failed (empty filename) in {time() - start_time:.3f} seconds")
            return add_cors_headers(response[0]), response[1]

        # Generate unique filenames to avoid conflicts
        import uuid
        unique_id = str(uuid.uuid4())
        image_filename = f"{unique_id}_{image_file.filename}"
        json_filename = f"{unique_id}_{json_file.filename}"
        
        # Save the uploaded files
        image_path = os.path.join(UPLOAD_FOLDER, image_filename)
        json_path = os.path.join(UPLOAD_FOLDER, json_filename)
        
        image_file.save(image_path)
        json_file.save(json_path)
        
        logging.info(f"Files saved: {image_path}, {json_path}")

        # Load the JSON and Image
        data, image = load_json_and_image(json_path, image_path)
        if data is None or image is None:
            response = jsonify({"error": "Failed to load files"}), 400
            logging.info(f"POST /upload failed (file loading) in {time() - start_time:.3f} seconds")
            return add_cors_headers(response[0]), response[1]

        # Perform Segmentation
        segmented_image = draw_segmentation(data, image)
        if segmented_image is None:
            response = jsonify({"error": "Segmentation failed"}), 500
            logging.info(f"POST /upload failed (segmentation) in {time() - start_time:.3f} seconds")
            return add_cors_headers(response[0]), response[1]

        # Save the segmented image with unique name
        segmented_image_filename = f"segmented_{unique_id}.jpg"
        segmented_image_path = os.path.join(RESULTS_FOLDER, segmented_image_filename)
        cv2.imwrite(segmented_image_path, segmented_image)
        
        logging.info(f"Segmented image saved at: {segmented_image_path}")

        # Perform Prediction
        try:
            classes = ["3VT", "ARSA", "AVSD", "Dilated Cardiac Sinus", "ECIF", "HLHS", "LVOT", "Normal Heart", "TGA", "VSD"]
            predictions = predict_single_image(segmented_image_path, model, classes, torch.device("cpu"))
            
            if predictions is None:
                response = jsonify({"error": "Prediction failed"}), 500
                logging.info(f"POST /upload failed (prediction) in {time() - start_time:.3f} seconds")
                return add_cors_headers(response[0]), response[1]
                
            logging.info(f"Predictions: {predictions}")
            
            # Return results to frontend
            response = jsonify({
                "predictions": predictions,
                "annotations": data["shapes"],
                "segmented_image": f'/results/{segmented_image_filename}'
            })
            logging.info(f"POST /upload completed in {time() - start_time:.3f} seconds")
            return add_cors_headers(response)
            
        except Exception as e:
            logging.error(f"Prediction error: {str(e)}")
            response = jsonify({"error": f"Prediction error: {str(e)}"}), 500
            logging.info(f"POST /upload failed (prediction exception) in {time() - start_time:.3f} seconds")
            return add_cors_headers(response[0]), response[1]

    except Exception as e:
        logging.error(f"Error in upload process: {str(e)}")
        response = jsonify({"error": str(e)}), 500
        logging.info(f"POST /upload failed (general exception) in {time() - start_time:.3f} seconds")
        return add_cors_headers(response[0]), response[1]

# Route to serve the segmented images
@app.route('/results/<filename>')
def serve_result(filename):
    start_time = time()
    response = send_from_directory(RESULTS_FOLDER, filename)
    logging.info(f"GET /results/{filename} processed in {time() - start_time:.3f} seconds")
    return add_cors_headers(response)

# Route to serve uploaded files (if needed)
@app.route('/uploads/<filename>')
def serve_upload(filename):
    start_time = time()
    response = send_from_directory(UPLOAD_FOLDER, filename)
    logging.info(f"GET /uploads/{filename} processed in {time() - start_time:.3f} seconds")
    return add_cors_headers(response)

# Add OPTIONS handling for all routes to support CORS preflight requests
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    start_time = time()
    response = app.make_default_options_response()
    logging.info(f"OPTIONS /{path} processed in {time() - start_time:.3f} seconds")
    return add_cors_headers(response)

# Attempt to initialize the model when the application starts
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Try to load the model at startup
    initialize_model()
    # Debug set to False for production
    app.run(host="0.0.0.0", port=port, debug=False)
