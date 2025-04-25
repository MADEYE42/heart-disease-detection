from flask import Flask, request, jsonify, send_from_directory
import os
import json
import cv2
import numpy as np
from segmentation import load_json_and_image, draw_segmentation  # Code 01
from prediction import predict_single_image, load_model  # Code 02
from PIL import Image
import torch
from flask_cors import CORS
import logging
import threading

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Flask app
app = Flask(__name__)
# Enable CORS with specific origin
CORS(app, resources={
    r"/*": {
        "origins": ["https://heart-disease-detection-2qcz.onrender.com"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Directory for file uploads and results
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Global variable to track if model is loaded
model_loaded = False
model = None

def load_model_on_startup():
    global model, model_loaded
    try:
        MODEL_PATH = "model_path.pth"
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logging.info(f"Loading model on device: {device}")
        model = load_model(MODEL_PATH, num_classes=10, device=device)
        model_loaded = True
        logging.info("Model loaded successfully")
    except Exception as e:
        logging.error(f"Failed to load model: {str(e)}")
        model_loaded = False

# Start model loading in a separate thread to avoid blocking app startup
threading.Thread(target=load_model_on_startup).start()

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_loaded": model_loaded})

# Route for uploading image and JSON files
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_files():
    # Handle preflight OPTIONS requests
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers.add('Access-Control-Allow-Origin', 'https://heart-disease-detection-2qcz.onrender.com')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    try:
        # Check if model is loaded
        global model_loaded, model
        if not model_loaded:
            return jsonify({'error': 'Model is still loading. Please try again in a few moments.'}), 503
        
        # Check if files are included
        if 'image' not in request.files or 'json' not in request.files:
            return jsonify({'error': 'No image or JSON file part in the request'}), 400
        
        image_file = request.files['image']
        json_file = request.files['json']
        
        if image_file.filename == '' or json_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

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
            return jsonify({"error": "Failed to load files"}), 400

        # Perform Segmentation
        segmented_image = draw_segmentation(data, image)
        if segmented_image is None:
            return jsonify({"error": "Segmentation failed"}), 500

        # Save the segmented image with unique name
        segmented_image_filename = f"segmented_{unique_id}.jpg"
        segmented_image_path = os.path.join(RESULTS_FOLDER, segmented_image_filename)
        cv2.imwrite(segmented_image_path, segmented_image)
        
        logging.info(f"Segmented image saved at: {segmented_image_path}")

        # Perform Prediction with a timeout
        try:
            classes = ["3VT", "ARSA", "AVSD", "Dilated Cardiac Sinus", "ECIF", "HLHS", "LVOT", "Normal Heart", "TGA", "VSD"]
            predictions = predict_single_image(segmented_image_path, model, classes, torch.device("cuda" if torch.cuda.is_available() else "cpu"))
            
            if predictions is None:
                return jsonify({"error": "Prediction failed"}), 500
                
            logging.info(f"Predictions: {predictions}")
            
            # Return results to frontend
            response = jsonify({
                "predictions": predictions,
                "annotations": data["shapes"],
                "segmented_image": f'/results/{segmented_image_filename}'
            })
            
            response.headers.add('Access-Control-Allow-Origin', 'https://heart-disease-detection-2qcz.onrender.com')
            return response
            
        except Exception as e:
            logging.error(f"Prediction error: {str(e)}")
            return jsonify({"error": f"Prediction error: {str(e)}"}), 500

    except Exception as e:
        logging.error(f"Error in upload process: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Route to serve the segmented images
@app.route('/results/<filename>')
def serve_result(filename):
    return send_from_directory(RESULTS_FOLDER, filename)

# Route to serve uploaded files (if needed)
@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# Main entry point
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)  # Set debug=False in production