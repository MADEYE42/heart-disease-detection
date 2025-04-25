import React from "react";
import UploadForm from "../components/UploadForm";
import BackgroundImage from "../assets/Background.png";

const Upload = () => {
  return (
    <div
      className="min-h-screen flex flex-col bg-[#f3f4f6] font-[Poppins] relative"
      style={{
        backgroundImage: `url(${BackgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0"></div>

      {/* Main Section */}
      <div className="flex-grow w-full px-4 md:px-12 lg:px-24 py-6 flex items-center justify-center relative z-10">
        <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg p-6 md:p-8">
          <UploadForm />
        </div>
      </div>
    </div>
  );
};

export default Upload;
