import React from "react";
import { Heart, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const socialLinks = [
    { Icon: Facebook, href: "https://facebook.com" },
    { Icon: Twitter, href: "https://twitter.com" },
    { Icon: Linkedin, href: "https://linkedin.com" },
    { Icon: Instagram, href: "https://instagram.com" },
  ];

  return (
    <footer className="bg-gradient-to-b from-gray-50/60 via-gray-100/70 to-gray-200/80 text-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="w-7 h-7 text-pink-500" />
              <span className="text-2xl font-bold text-gray-800">
                Fetal Heart Care
              </span>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">
              Empowering lives through advanced heart care solutions. Your
              heart, our priority.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="/" className="footer-link">
                  Home
                </a>
              </li>
              <li>
                <a href="/upload" className="footer-link">
                  Upload Scans
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Us Section */}
          <div>
            <Link to="/contact-us">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Contact Us
              </h3>
            </Link>
            <p className="text-gray-600">
              Have questions? Need assistance with fetal heart care? Our team is
              here to help. Reach out to us for personalized support and
              guidance.{" "}
              <Link
                to="/contact-us"
                className="text-pink-500 hover:text-pink-600"
              >
                Contact us now.
              </Link>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Follow Us
            </h3>
            <div className="flex gap-6">
              {socialLinks.map(({ Icon, href }, index) => (
                <a
                  key={index}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center hover:bg-pink-500 transition-all duration-300 transform hover:scale-110"
                >
                  <Icon className="w-6 h-6 text-gray-800" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-8 text-center">
          <p className="text-gray-600 text-lg">
            © {new Date().getFullYear()} Fetal Heart Care. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        .footer-link {
          @apply text-gray-600 hover:text-gray-800 transition-colors duration-300;
        }
      `}</style>
    </footer>
  );
};

export default Footer;
