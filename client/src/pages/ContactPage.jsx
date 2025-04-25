import React from "react";
import { Mail, Phone, MapPin, User, BookOpen, Stethoscope } from "lucide-react";
import BackgroundImage from "../assets/Background.png";

const ContactPage = () => {
  const teamMembers = [
    {
      name: "Dr. Nikita",
      title: "Certified Gynaecologist & Fetal Medicine Specialist",
      email: "drnikita1962@gmail.com",
      icon: Stethoscope,
      specialization: "Fetal Medicine",
    },
    {
      name: "Prof Nusrat Ansari",
      title: "Research Scholar",
      department: "Department of Computer Engineering",
      email: "nusrat.ansari@ves.ac.in",
      icon: BookOpen,
      specialization: "Computer Engineering",
    },
  ];

  return (
    <div
      className="min-h-screen py-20 bg-cover bg-center"
      style={{ backgroundImage: `url(${BackgroundImage})` }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold text-gray-800 mb-4">
            Meet Our Team
          </h1>
          <div className="w-20 h-1 bg-pink-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="h-32 bg-pink-100 flex items-center justify-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  <member.icon className="w-10 h-10 text-pink-500" />
                </div>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                    {member.name}
                  </h2>
                  <p className="text-pink-500 font-medium">{member.title}</p>
                  {member.department && (
                    <p className="text-gray-600 mt-1">{member.department}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Mail className="w-5 h-5 text-pink-500" />
                    <a
                      href={`mailto:${member.email}`}
                      className="hover:text-pink-500 transition-colors"
                    >
                      {member.email}
                    </a>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <User className="w-5 h-5 text-pink-500" />
                    <span>Specialization: {member.specialization}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800">
              Get in Touch
            </h2>
            <p className="text-gray-600 mt-2">
              Have questions? We're here to help!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-pink-500 transition-colors duration-300">
                <Mail className="w-8 h-8 text-pink-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-800">Email Us</h3>
              <p className="text-gray-600 mt-2">support@fetalheartcare.com</p>
            </div>

            <div className="group">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-pink-500 transition-colors duration-300">
                <Phone className="w-8 h-8 text-pink-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-800">Call Us</h3>
              <p className="text-gray-600 mt-2">+1 (555) 123-4567</p>
            </div>

            <div className="group">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-pink-500 transition-colors duration-300">
                <MapPin className="w-8 h-8 text-pink-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-800">Visit Us</h3>
              <p className="text-gray-600 mt-2">Mumbai, Maharashtra</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
