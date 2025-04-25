import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Menu, X, Upload, Home } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-lg border-b border-pink-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-pink-500" strokeWidth={2.5} />
            <span className="text-2xl font-semibold text-gray-800">
              Fetal Heart Care
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="nav-link">
              <div className="flex items-center gap-2 hover:bg-pink-500 p-2 duration-300 rounded-lg hover:text-white">
                <Home className="w-5 h-5" />
                <span className="text-lg">Home</span>
              </div>
            </Link>
            <Link to="/upload" className="nav-link">
              <div className="flex items-center gap-2 hover:bg-pink-500 p-2 duration-300 rounded-lg hover:text-white">
                <Upload className="w-5 h-5" />
                <span className="text-lg">Upload</span>
              </div>
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? (
              <X className="w-6 h-6 text-gray-800" />
            ) : (
              <Menu className="w-6 h-6 text-gray-800" />
            )}
          </button>
        </div>

        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <div className="py-3 space-y-3">
            <Link to="/" className="mobile-nav-link">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                <span>Home</span>
              </div>
            </Link>
            <Link to="/upload" className="mobile-nav-link">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                <span>Upload</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .nav-link {
          @apply flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors font-medium;
        }
        .mobile-nav-link {
          @apply flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-pink-500 transition-colors font-medium;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
