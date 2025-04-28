import React, { useState, useEffect } from "react";
import axios from "axios";

import BackgroundImage from "../assets/Background.png";

// Backend URL (remove trailing slash)
const BACKEND_URL = "https://heart-disease-detection-vwnf.onrender.com";
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 3000; // Base delay before exponential backoff
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

const UploadForm = () => {
  const [image, setImage] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retries, setRetries] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [relatedImages, setRelatedImages] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");

  // Check if backend is available on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 10000 });
        if (response.data && response.data.status === "healthy") {
          setBackendStatus("online");
          console.log("Backend is online and healthy");
        } else {
          setBackendStatus("unhealthy");
          console.warn("Backend is responding but unhealthy");
        }
      } catch (err) {
        console.error("Error checking backend status:", err);
        setBackendStatus("offline");
      }
    };
    
    checkBackendStatus();
    
    // Set up interval to periodically check backend status
    const interval = setInterval(checkBackendStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadRelatedImages = (className) => {
    try {
      const context = require.context(
        "./assets/RelatedImages",
        false,
        new RegExp(`^./${className}/.*\\.jpg$`)
      );
      const images = context.keys().map(context);
      console.log("Related images:", images);
      setRelatedImages(images);
    } catch (error) {
      console.error("Error loading related images:", error);
    }
  };

  const validateFiles = () => {
    if (!image || !jsonFile) {
      setError("Please select both an image and a JSON file.");
      return false;
    }
    
    // Check file size
    if (image.size > MAX_FILE_SIZE) {
      setError(`Image file is too large (${(image.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return false;
    }
    
    // Check file types
    if (!image.type.startsWith('image/')) {
      setError("Please select a valid image file.");
      return false;
    }
    
    if (jsonFile.type !== 'application/json' && !jsonFile.name.endsWith('.json')) {
      setError("Please select a valid JSON file.");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted");

    // Validate files
    if (!validateFiles()) {
      return;
    }

    // Check if backend is online before attempting upload
    if (backendStatus !== "online") {
      setError(`Backend appears to be ${backendStatus}. Please try again later.`);
      return;
    }

    setLoading(true);
    setError(null);
    setPredictions(null);
    setRelatedImages([]);
    setImageUrl(null);
    setRetries(0);
    setUploadProgress(0);
    
    await uploadFiles();
  };
  
  const uploadFiles = async () => {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("json", jsonFile);

    // Log the formData contents for debugging
    console.log("FormData contents:");
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    // Calculate exponential backoff delay
    const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retries);

    try {
      // Make a preflight request first to check CORS setup
      if (retries === 0) {
        try {
          console.log(`Sending OPTIONS preflight request to ${BACKEND_URL}/upload`);
          await axios({
            method: 'OPTIONS',
            url: `${BACKEND_URL}/upload`,
            headers: {
              'Origin': window.location.origin,
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'content-type,x-requested-with'
            },
            timeout: 5000
          });
          console.log("Preflight request successful");
        } catch (preflightErr) {
          console.warn("Preflight request failed:", preflightErr);
          // Continue anyway, the actual request might work
        }
      }

      console.log(`Sending POST request to ${BACKEND_URL}/upload (attempt ${retries + 1})...`);
      const response = await axios.post(
        `${BACKEND_URL}/upload`,
        formData,
        {
          headers: { 
            "Content-Type": "multipart/form-data",
            "X-Requested-With": "XMLHttpRequest"
          },
          withCredentials: false,  // Keep this false for cross-origin requests
          timeout: 120000, // 2 minutes
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          },
          // Added validateStatus to handle non-2xx responses properly
          validateStatus: function (status) {
            return status >= 200 && status < 600; // Accept all status codes for better error handling
          }
        }
      );

      // Check if the response has an error status
      if (response.status >= 400) {
        throw { 
          response: response,
          message: response.data?.error || "Server error"
        };
      }

      console.log("Response from backend:", response.data);
      
      // Reset upload progress after successful upload
      setUploadProgress(0);
      
      // Process predictions if available
      if (response.data.predictions) {
        setPredictions(response.data.predictions);

        // Find the class with the highest probability
        const highestPrediction = response.data.predictions.reduce(
          (max, prediction) =>
            prediction.probability > max.probability ? prediction : max,
          { probability: 0 }
        );

        // Load related images based on the highest prediction class
        if (highestPrediction && highestPrediction.class) {
          loadRelatedImages(highestPrediction.class);
        }
      } else {
        setError("No predictions received from the server.");
      }

      // Process segmented image if available
      if (response.data.segmented_image) {
        const segmentedImageUrl = `${BACKEND_URL}${response.data.segmented_image}`;
        setImageUrl(segmentedImageUrl);
        console.log("Segmented Image URL:", segmentedImageUrl);
      } else {
        console.warn("No segmented image in response");
      }
      
      setLoading(false);
      
    } catch (err) {
      console.error("Error during upload:", err);
      console.log("Error details:", err.config, err.response);
      
      // Handle different types of errors
      if (err.code === "ECONNABORTED" || err.code === "ERR_NETWORK") {
        // Handle timeout or network errors with retries and exponential backoff
        if (retries < MAX_RETRIES) {
          console.log(`Request failed. Retrying in ${retryDelay/1000} seconds...`);
          setError(`Request failed. Retrying (${retries + 1}/${MAX_RETRIES}) in ${retryDelay/1000}s...`);
          
          setRetries(prev => prev + 1);
          setTimeout(() => {
            uploadFiles();
          }, retryDelay);
          return;
        } else {
          setError("The server is taking too long to respond. Please try with a smaller image or try again later.");
        }
      } else if (err.response && err.response.status === 429) {
        // Handle rate limiting
        setError("Server is busy. Please wait a moment and try again.");
      } else if (err.response && err.response.status === 413) {
        // Handle payload too large
        setError("Image file is too large. Please use a smaller image.");
      } else if (err.response) {
        // Handle other response errors
        const errorMsg = err.response.data?.error || err.response.statusText || "Unknown error";
        setError(`Server error (${err.response.status}): ${errorMsg}`);
      } else if (err.request) {
        // Handle no response
        setError("No response from server. The server might be overloaded or down. Please try again later.");
      } else {
        // Handle general errors
        setError(`Error: ${err.message || "Unknown error occurred"}`);
      }
      
      setLoading(false);
    }
  };

  // Handle file input change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Reset error if it was related to the image
      if (error && (error.includes("image") || error.includes("Image"))) {
        setError(null);
      }
    }
  };

  const handleJsonChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setJsonFile(file);
      // Reset error if it was related to the JSON file
      if (error && error.includes("JSON")) {
        setError(null);
      }
    }
  };

  return (
    <div
      className="min-h-[70vh] bg-cover bg-center bg-no-repeat flex justify-center items-center p-6"
      style={{ backgroundImage: `url(${BackgroundImage})` }}
    >
      <div className="bg-white bg-opacity-70 p-8 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-semibold text-center mb-6 text-pink-800">
          Heart Disease Detection
        </h1>
        
        {/* Backend status indicator */}
        <div className={`text-center mb-4 ${
          backendStatus === "online" ? "text-green-600" : 
          backendStatus === "offline" ? "text-red-600" : 
          "text-yellow-600"
        }`}>
          Backend status: {backendStatus === "checking" ? "Checking..." : backendStatus}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm text-pink-700">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
              className="w-full p-3 border border-pink-300 rounded-md bg-pink-50 text-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            {image && (
              <p className="mt-1 text-xs text-gray-500">
                Selected file: {image.name} ({(image.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          <div>
            <label className="block mb-2 text-sm text-pink-700">
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleJsonChange}
              required
              className="w-full p-3 border border-pink-300 rounded-md bg-pink-50 text-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            {jsonFile && (
              <p className="mt-1 text-xs text-gray-500">
                Selected file: {jsonFile.name} ({(jsonFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          
          {/* Upload progress bar */}
          {loading && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-pink-500 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1">Upload progress: {uploadProgress}%</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || backendStatus !== "online"}
            className={`w-full py-3 rounded-md bg-pink-500 text-white font-semibold ${
              loading || backendStatus !== "online" ? "opacity-50" : "hover:bg-pink-600"
            } transition-all`}
          >
            {loading ? `Processing${".".repeat((retries % 3) + 1)}` : "Submit"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {imageUrl && (
          <div className="mt-6">
            <h3 className="font-semibold text-pink-800 mb-2">Segmented Image:</h3>
            <img 
              src={imageUrl} 
              alt="Segmented Result" 
              className="w-full rounded-md shadow-sm"
              onError={(e) => {
                console.error("Image failed to load");
                e.target.style.display = 'none';
                setError(prev => prev ? `${prev}\nFailed to load the segmented image.` : "Failed to load the segmented image.");
              }}
            />
          </div>
        )}

        {predictions && (
          <div className="mt-6">
            <h3 className="font-semibold text-pink-800">Predictions:</h3>
            <ul className="list-disc pl-5 text-pink-700">
              {predictions.map((pred, index) => (
                <li key={index}>
                  <span className="font-medium">{pred.class}:</span> {pred.probability.toFixed(2)}%
                  {index === 0 && <span className="ml-2 text-xs bg-pink-200 px-1 rounded">Highest</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {relatedImages.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-pink-800 mb-2">Related Images:</h3>
            <div className="grid grid-cols-2 gap-2">
              {relatedImages.map((img, index) => (
                <img 
                  key={index} 
                  src={img} 
                  alt={`Related ${index + 1}`} 
                  className="w-full h-32 object-cover rounded-md"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadForm;
