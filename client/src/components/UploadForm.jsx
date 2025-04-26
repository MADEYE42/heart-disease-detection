import React, { useState } from "react";
import axios from "axios";

import BackgroundImage from "../assets/Background.png";

// Backend URL
const BACKEND_URL = "https://server-5ge0.onrender.com";
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

const UploadForm = () => {
  const [image, setImage] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retries, setRetries] = useState(0);
  const [relatedImages, setRelatedImages] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted");

    // Validate files are selected
    if (!image || !jsonFile) {
      setError("Please select both an image and a JSON file.");
      return;
    }

    setLoading(true);
    setError(null);
    setPredictions(null);
    setRelatedImages([]);
    setImageUrl(null);
    setRetries(0);
    
    await uploadFiles();
  };
  
  const uploadFiles = async () => {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("json", jsonFile);

    try {
      console.log(`Sending POST request to ${BACKEND_URL}/upload (attempt ${retries + 1})...`);
      const response = await axios.post(
        `${BACKEND_URL}/upload`,
        formData,
        {
          headers: { 
            "Content-Type": "multipart/form-data"
          },
          withCredentials: false,
          timeout: 90000 // 90 seconds
        }
      );

      console.log("Response from backend:", response.data);

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

      if (response.data.segmented_image) {
        const segmentedImageUrl = `${BACKEND_URL}${response.data.segmented_image}`;
        setImageUrl(segmentedImageUrl);
        console.log("Segmented Image URL:", segmentedImageUrl);
      } else {
        console.warn("No segmented image in response");
      }
      
      setLoading(false);
      
    } catch (err) {
      console.error("Error during upload:", err, err.config, err.response);
      
      if (err.code === "ECONNABORTED") {
        if (retries < MAX_RETRIES) {
          console.log(`Request timed out. Retrying in ${RETRY_DELAY/1000} seconds...`);
          setError(`Request timed out. Retrying (${retries + 1}/${MAX_RETRIES})...`);
          
          setRetries(prev => prev + 1);
          setTimeout(() => {
            uploadFiles();
          }, RETRY_DELAY);
          return;
        } else {
          setError("The server is taking too long to respond. The operation might be too resource-intensive. Please try with a smaller image or try again later.");
        }
      } else if (err.code === "ERR_NETWORK") {
        setError("Network error: The server is unreachable. Please check your internet connection or try again later.");
      } else if (err.response) {
        const errorMsg = err.response.data?.error || err.response.statusText || "Unknown error";
        setError(`Server error (${err.response.status}): ${errorMsg}`);
      } else if (err.request) {
        setError("No response from server. The server might be overloaded or down. Please try again later.");
      } else {
        setError(`Error: ${err.message || "Unknown error occurred"}`);
      }
      
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[70vh] bg-cover bg-center bg-no-repeat flex justify-center items-center p-6"
      style={{ backgroundImage: `url(${BackgroundImage})` }}
    >
      <div className="bg-white bg-opacity-70 p-8 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-semibold text-center mb-6 text-pink-800">
          Upload Files
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm text-pink-700">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
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
              onChange={(e) => setJsonFile(e.target.files[0])}
              required
              className="w-full p-3 border border-pink-300 rounded-md bg-pink-50 text-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            {jsonFile && (
              <p className="mt-1 text-xs text-gray-500">
                Selected file: {jsonFile.name} ({(jsonFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-md bg-pink-500 text-white font-semibold ${
              loading ? "opacity-50" : "hover:bg-pink-600"
            } transition-all`}
          >
            {loading ? `Processing${".".repeat(retries + 1)}` : "Submit"}
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
                  {pred.class}: {pred.probability.toFixed(2)}%
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