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

    setLoading(true);
    setError(null);
    setPredictions(null);
    setRelatedImages([]);
    setImageUrl(null);

    const formData = new FormData();
    formData.append("image", image);
    formData.append("json", jsonFile);

    try {
      console.log("Sending request...");
      const response = await axios.post(
        "https://project-phjh.onrender.com/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
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
        loadRelatedImages(highestPrediction.class);
      } else {
        setError("Predictions are missing in the response.");
      }

      if (response.data.segmented_image) {
        setImageUrl(response.data.segmented_image);
        console.log("Segmented Image URL:", response.data.segmented_image);
      }
    } catch (err) {
      console.error("Error during upload:", err);
      setError(
        err.response?.data?.error || "An error occurred during the upload"
      );
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
      </div>
    </div>
  );
};

export default UploadForm;
