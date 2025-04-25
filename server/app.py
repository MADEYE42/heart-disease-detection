from flask import Flask, request, jsonify, send_from_directory
import os
import json
import cv2
import numpy as np
from segmentation import load_json_and_image, draw_segmentation  # Code 01
from prediction import predict_single_image, load_model  # Code 02
from PIL import Image
import torch
from flask_cors import CORS  # Added CORS for cross-origin requests
import logging

# Set up logging for easier debugging
logging.basicConfig(level=logging.INFO)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

MODEL_PATH = "model_path.pth"  # Ensure this file is available in the correct path
DATA_DIR = "SplittedDataNew/train/"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = load_model(MODEL_PATH, num_classes=10, device=device)  # Assuming 10 classes

# Directory for file uploads
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Route for uploading image and JSON files
@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        # Check if image and JSON files are included
        if 'image' not in request.files or 'json' not in request.files:
            return jsonify({'error': 'No image or JSON file part in the request'}), 400
        
        image_file = request.files['image']
        json_file = request.files['json']

        # Save the uploaded files to disk
        image_path = os.path.join(UPLOAD_FOLDER, image_file.filename)
        json_path = os.path.join(UPLOAD_FOLDER, json_file.filename)

        image_file.save(image_path)
        json_file.save(json_path)

        # Load the JSON and Image
        data, image = load_json_and_image(json_path, image_path)
        if data is None or image is None:
            return jsonify({"error": "Failed to load files"}), 400

        # Perform Segmentation (Code 01)
        segmented_image = draw_segmentation(data, image)
        if segmented_image is None:
            return jsonify({"error": "Segmentation failed"}), 500

        # Save the segmented image
        segmented_image_path = 'segmented_output.jpg'
        cv2.imwrite(segmented_image_path, segmented_image)

        # Debugging: Check the segmented image path
        logging.info(f"Segmented image saved at: {segmented_image_path}")

        # Perform Prediction (Code 02)
        predictions = predict_single_image(segmented_image_path, model, ["3VT", "ARSA", "AVSD", "Dilated Cardiac Sinus", "ECIF", "HLHS", "LVOT", "Normal Heart", "TGA", "VSD"], device)

        if predictions is None:
            return jsonify({"error": "Prediction failed"}), 500

        # Debugging step: Check predictions
        logging.info(f"Predictions: {predictions}")

        # Return prediction, annotations, and image URL to frontend
        return jsonify({
            "predictions": predictions,
            "annotations": data["shapes"],
            "segmented_image": f'segmented_output.jpg'  # Image URL
        })

    except Exception as e:
        logging.error(f"Error: {str(e)}")  # Log the error
        return jsonify({"error": str(e)}), 500


# Route to serve the segmented image
@app.route('/images/<filename>')
def serve_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)  # Ensure it's served from the correct folder


# Serving the frontend files from 'dist' folder
frontend_folder = os.path.join(os.getcwd(), "..", "client")
dist_folder = os.path.join(frontend_folder, "dist")

@app.route("/", defaults={"filename": ""})
@app.route("/<path:filename>")
def index(filename):
    if not filename:
        filename = "index.html"
    return send_from_directory(dist_folder, filename)


# Main entry point
if __name__ == "__main__":
    # Render sets the port dynamically, so bind to the PORT environment variable
    port = int(os.environ.get("PORT", 5000))  # Default to 5000 if PORT is not set
    app.run(host="0.0.0.0", port=port, debug=True)
