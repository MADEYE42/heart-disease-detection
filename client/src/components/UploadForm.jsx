import React, { useState } from "react";
import axios from "axios";

import BackgroundImage from "../assets/Background.png";

const UploadForm = () => {
  const [image, setImage] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [relatedImages, setRelatedImages] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);

  const loadRelatedImages = (className) => {
    try {
      const context = require.context(
        "./assets/RelatedImages", // Adjust path if needed
        false,
        new RegExp(`^./${className}/.*\\.jpg$`)
      );
      const images = context.keys().map(context);
      console.log("Related images:", images);
      setRelatedImages(images);
    } catch (error) {
      console.error("Error loading related images:", error);
      setError("Failed to load related images.");
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

    const formData = new FormData();
    formData.append("image", image);
    formData.append("json", jsonFile);

    try {
      console.log("Sending request to backend...");
      const response = await axios.post(
        "https://project-phjh.onrender.com/upload",
        formData,
        {
          headers: { 
            "Content-Type": "multipart/form-data"
          },
          withCredentials: false, // Important for CORS requests
          timeout: 60000 // 60 seconds timeout for long operations
        }
      );

      // Debugging: Log the response
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
        setError("Predictions are missing in the response.");
      }

      if (response.data.segmented_image) {
        // Construct the full URL for the segmented image
        const segmentedImageUrl = `https://project-phjh.onrender.com${response.data.segmented_image}`;
        setImageUrl(segmentedImageUrl);
        console.log("Segmented Image URL:", segmentedImageUrl);
      }
    } catch (err) {
      console.error("Error during upload:", err);
      
      // Better error handling with more specific messages
      if (err.code === "ERR_NETWORK") {
        setError("Network error: The server is unreachable or CORS is not configured correctly.");
      } else if (err.response) {
        // Server responded with a status code that falls out of the range of 2xx
        setError(`Server error: ${err.response.data?.error || err.response.statusText || "Unknown error"}`);
      } else if (err.request) {
        // The request was made but no response was received
        setError("No response from server. Please try again later.");
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Error: ${err.message || "Unknown error occurred"}`);
      }
    } finally {
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
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-md bg-pink-500 text-white font-semibold ${
              loading ? "opacity-50" : "hover:bg-pink-600"
            } transition-all`}
          >
            {loading ? "Processing..." : "Submit"}
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
                setError("Failed to load the segmented image.");
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