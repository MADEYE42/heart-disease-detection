from flask import Flask, jsonify
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for the /upload route (simplified for testing)
CORS(app, resources={r"/upload": {"origins": "https://heart-disease-detection-ln3u8opjd-gouresh-madyes-projects.vercel.app",
                                   "methods": ["POST", "OPTIONS"],
                                   "allow_headers": ["Content-Type", "X-Requested-With"]}})
# CORS for the test route
CORS(app, resources={r"/test-cors": {"origins": "https://heart-disease-detection-ln3u8opjd-gouresh-madyes-projects.vercel.app"}})
# CORS for health check
CORS(app, resources={r"/health": {"origins": "*"}})
# CORS for root
CORS(app, resources={r"/": {"origins": "*"}})

# Route for health check
@app.route('/', methods=['GET'])
def root():
    return jsonify({"status": "service is running"})

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Simplified for CORS test"})

# Test CORS route
@app.route('/test-cors', methods=['GET'])
def test_cors():
    return jsonify({"message": "CORS test successful"})

# Simplified route for uploading (for CORS testing)
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_files_test():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        return response
    elif request.method == 'POST':
        response = jsonify({"message": "Upload endpoint reached (CORS test)"})
        return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
