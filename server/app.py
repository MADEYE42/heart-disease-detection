from flask import Flask, request, jsonify, send_from_directory
import os
import json
import cv2
import numpy as np
from PIL import Image
import torch
import logging
import uuid
from time import time
from flask_cors import CORS

# Import your modules here
from segmentation import load_json_and_image, draw_segmentation
from prediction import predict_single_image, load_model

# Setup Logging
logging.basicConfig(level=logging.INFO)

# Initialize Flask App
app = Flask(__name__)

# Enable CORS with explicit origin instead of wildcard for better security
CORS(app,
     origins=["https://heart-disease-detection-5uktr7ulx-gouresh-madyes-projects.vercel.app"],
     supports_credentials=False,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "OPTIONS"])

# Fallback: Add CORS headers manually to ensure they're included in all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'https://heart-disease-detection-5uktr7ulx-gouresh-madyes-projects.vercel.app')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# Upload and Results Directory
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Load Model Globally
model = None

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

# Health Check
@app.route('/health', methods=['GET'])
def health_check():
    global model
    if model is None:
        success = initialize_model()
        if not success:
            return jsonify({"status": "unhealthy", "model": "failed to load"}), 500
    return jsonify({"status": "healthy", "model": "loaded"})

# Upload Endpoint
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_files():
    start_time = time()

    # Handle OPTIONS preflight
    if request.method == 'OPTIONS':
        return app.make_default_options_response()

    try:
        # Ensure model is loaded
        global model
        if model is None:
            success = initialize_model()
            if not success:
                return jsonify({"error": "Model failed to load"}), 503

        # Validate uploaded files
        if 'image' not in request.files or 'json' not in request.files:
            return jsonify({'error': 'Missing image or JSON file'}), 400

        image_file = request.files['image']
        json_file = request.files['json']

        if image_file.filename == '' or json_file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        # Save files with unique names
        uid = str(uuid.uuid4())
        img_path = os.path.join(UPLOAD_FOLDER, f"{uid}_{image_file.filename}")
        json_path = os.path.join(UPLOAD_FOLDER, f"{uid}_{json_file.filename}")

        image_file.save(img_path)
        json_file.save(json_path)

        # Load data
        data, image = load_json_and_image(json_path, img_path)
        if data is None or image is None:
            return jsonify({"error": "Failed to load files"}), 400

        # Segmentation
        segmented_image = draw_segmentation(data, image)
        if segmented_image is None:
            return jsonify({"error": "Segmentation failed"}), 500

        seg_path = os.path.join(RESULTS_FOLDER, f"segmented_{uid}.jpg")
        cv2.imwrite(seg_path, segmented_image)

        # Prediction
        classes = ["3VT", "ARSA", "AVSD", "Dilated Cardiac Sinus", "ECIF", "HLHS", "LVOT", "Normal Heart", "TGA", "VSD"]
        predictions = predict_single_image(seg_path, model, classes, torch.device("cpu"))

        if predictions is None:
            return jsonify({"error": "Prediction failed"}), 500

        return jsonify({
            "predictions": predictions,
            "annotations": data["shapes"],
            "segmented_image": f'/results/segmented_{uid}.jpg'
        })

    except Exception as e:
        logging.error(f"Upload error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Serve results
@app.route('/results/<filename>')
def serve_result(filename):
    return send_from_directory(RESULTS_FOLDER, filename)

# Run App
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
