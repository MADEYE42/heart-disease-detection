import React, { useState } from "react";
import BackgroundImage from "../assets/Background.png";
import { FileText, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export default function ResearchPapers() {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const papers = [
    {
      title: "First-trimester ultrasound detection of fetal heart anomalies",
      subtitle: "Systematic review and meta-analysis",
      link: "https://obgyn.onlinelibrary.wiley.com/doi/epdf/10.1002/uog.23740",
      overview:
        "This study systematically evaluated the diagnostic accuracy of ultrasound performed during the 11–14 weeks of pregnancy for detecting major fetal heart abnormalities. The primary goal was to determine how effectively these early ultrasounds identify cardiac issues and to explore factors that influence detection rates.",
    },
    {
      title: "Detection of Cardiac Structural Abnormalities",
      subtitle: "Using Deep Learning on Fetal Ultrasound Videos",
      link: "https://www.mdpi.com/2076-3417/11/1/371",
      overview:
        "Artificial Intelligence (AI) technologies have increasingly been applied to medical imaging, but challenges remain in achieving accurate and consistent diagnoses, especially in fetal ultrasound screening for congenital heart disease (CHD).",
    },
    {
      title: "Prenatal Detection of Congenital Heart Disease",
      subtitle: "Fetal Echocardiography Following Normal Screening",
      link: "https://link.springer.com/article/10.1007/s00246-022-03032-6",
      overview:
        "The study focuses on the use of fetal echocardiography in detecting congenital heart disease (CHD) and examines the effectiveness of screening when conducted for various indications.",
    },
    {
      title: "Deep Learning-Based Computer-Aided Fetal Echocardiography",
      subtitle: "Heart Standard View Segmentation for CHD Detection",
      link: "https://www.mdpi.com/1424-8220/21/23/8007",
      overview:
        "This research paper presents an innovative deep learning approach for automatically analyzing fetal heart ultrasound images to detect congenital heart defects (CHDs), a critical medical condition affecting 5-9 out of 1000 births.",
    },
    {
      title: "Quality Metrics for Prenatal CHD Detection",
      subtitle: "Special Statement on Assessment Accuracy",
      link: "https://www.sciencedirect.com/science/article/pii/S0002937820302283",
      overview:
        "This special statement from the Society for Maternal-Fetal Medicine (SMFM) addresses a significant healthcare quality issue: the inadequate prenatal detection of congenital heart defects (CHD).",
    },
  ];

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div
      className="relative w-full min-h-screen bg-cover bg-center flex flex-col"
      style={{ backgroundImage: `url(${BackgroundImage})` }}
    >
      {" "}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <section className="text-center text-pink-800">
          <h1 className="text-6xl font-extrabold mb-6 tracking-tight animate-fade-in">
            Research Papers on Fetal Heart Disease Detection
          </h1>
          <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Discover groundbreaking research papers on prenatal screening,
            detection, and AI applications for congenital heart disease
            detection in fetuses.
          </p>
        </section>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper, index) => (
            <div
              key={index}
              className={`
                bg-white rounded-2xl overflow-hidden transition-all duration-300
                ${
                  expandedIndex === index
                    ? "ring-2 ring-pink-500 shadow-lg scale-100"
                    : "hover:shadow-md hover:scale-102 cursor-pointer"
                }
              `}
            >
              <div className="p-6" onClick={() => toggleExpand(index)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <FileText className="w-5 h-5 text-pink-600" />
                  </div>
                  {expandedIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {paper.title}
                </h2>
                <p className="text-sm text-gray-500">{paper.subtitle}</p>

                <div
                  className={`
                  overflow-hidden transition-all duration-300
                  ${
                    expandedIndex === index
                      ? "max-h-[2000px] opacity-100"
                      : "max-h-0 opacity-0"
                  }
                `}
                >
                  <div className="mt-6 space-y-4">
                    <p className="text-gray-600 leading-relaxed">
                      {paper.overview}
                    </p>

                    <Link
                      to={paper.link}
                      className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-medium"
                    >
                      Read Full Paper
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
