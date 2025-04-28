import os
import requests
import logging

logging.basicConfig(level=logging.INFO)

def download_model():
    """Download the model file from cloud storage if it doesn't exist locally"""
    model_path = os.environ.get("MODEL_PATH", "model_path.pth")
    model_url = os.environ.get("MODEL_URL", "")
    
    # Skip if model already exists or if URL not provided
    if os.path.exists(model_path):
        logging.info(f"Model already exists at {model_path}")
        return
    
    if not model_url:
        logging.warning("No MODEL_URL provided. Skipping download.")
        return
    
    try:
        logging.info(f"Downloading model from {model_url}")
        response = requests.get(model_url, stream=True)
        response.raise_for_status()
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path) if os.path.dirname(model_path) else '.', exist_ok=True)
        
        with open(model_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logging.info(f"Model downloaded successfully to {model_path}")
    except Exception as e:
        logging.error(f"Failed to download model: {str(e)}")
        raise
