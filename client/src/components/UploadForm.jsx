import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = "https://heart-disease-detection-vwnf.onrender.com";
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;

const UploadForm = () => {
  const [image, setImage] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retries, setRetries] = useState(0);
  const [predictions, setPredictions] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [relatedImages, setRelatedImages] = useState([]);

  // Check backend status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/health`, { timeout: 10000 });
        setBackendStatus(res.data.status === "healthy" ? "online" : "unhealthy");
      } catch (err) {
        setBackendStatus("offline");
      }
    };
    checkHealth();
  }, []);

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image || !jsonFile) {
      setError("Please select both an image and a JSON file.");
      return;
    }

    if (backendStatus !== "online") {
      setError(`Backend is ${backendStatus}`);
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", image);
    formData.append("json", jsonFile);

    try {
      console.log("Sending POST request...");
      const res = await axios.post(`${BACKEND_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000, // Increase timeout to avoid premature failure
      });

      if (res.status >= 400) {
        throw new Error("Server responded with an error");
      }

      console.log("Response:", res.data);
      setPredictions(res.data.predictions);
      setImageUrl(`${BACKEND_URL}/results/${res.data.segmented_image.split('/').pop()}`);

      // Optional: Load related images based on highest prediction
      const highestClass = res.data.predictions.reduce((prev, current) =>
        prev.probability > current.probability ? prev : current
      );
      if (highestClass?.class) {
        try {
          const context = require.context(
            "./assets/RelatedImages",
            false,
            new RegExp(`^./${highestClass.class}/.*\\.jpg$`)
          );
          const images = context.keys().map(context);
          setRelatedImages(images);
        } catch (err) {
          console.warn("No related images found");
        }
      }

    } catch (err) {
      let message = "An unknown error occurred.";
      if (err.code === "ECONNABORTED") {
        message = "Request timed out. Try again later.";
      } else if (err.response) {
        message = err.response.data?.error || err.response.statusText;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex justify-center items-center p-6">
      <div className="bg-white bg-opacity-70 p-8 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-semibold text-center mb-6 text-pink-800">Upload Files</h1>
        
        {/* Status */}
        <div className={`text-center mb-4 ${
          backendStatus === "online" ? "text-green-600" : 
          backendStatus === "offline" ? "text-red-600" : "text-yellow-600"
        }`}>
          Backend: {backendStatus}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label>Image</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} required />
          </div>
          <div>
            <label>JSON File</label>
            <input type="file" accept=".json" onChange={(e) => setJsonFile(e.target.files[0])} required />
          </div>
          <button type="submit" disabled={loading || backendStatus !== "online"}>
            {loading ? "Processing..." : "Submit"}
          </button>
        </form>

        {/* Errors */}
        {error && <div className="mt-4 text-red-600">{error}</div>}

        {/* Predictions */}
        {predictions && (
          <div className="mt-4">
            <h3>Predictions:</h3>
            <ul>
              {predictions.map((p, i) => (
                <li key={i}>{p.class}: {p.probability.toFixed(2)}%</li>
              ))}
            </ul>
          </div>
        )}

        {/* Segmented Image */}
        {imageUrl && <img src={imageUrl} alt="Segmented" className="mt-4 w-full" />}
      </div>
    </div>
  );
};

export default UploadForm;
