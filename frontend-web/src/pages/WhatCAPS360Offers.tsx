import React from 'react';

const WhatCAPS360Offers: React.FC = () => (
  <section className="py-16 bg-white border-t border-b">
    <div className="container mx-auto px-4 max-w-4xl">
      <h2 className="text-3xl font-bold mb-4 text-brand-blue">What CAPS360 Offers</h2>
      <p className="text-lg mb-4 text-gray-700">
        <strong>CAPS360</strong> is a digital education platform designed for learners, parents, and tutors in South Africa. We provide:
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Curriculum-aligned digital learning content and lessons</li>
        <li>AI-powered academic support, quizzes, and summaries</li>
        <li>Progress tracking and analytics</li>
        <li>Optional paid access to premium educational features and content</li>
      </ul>
      <p className="text-lg mb-2 text-gray-700">
        <strong>What users pay for:</strong>
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Subscription access to premium digital learning features</li>
        <li>Paid educational resources or content bundles</li>
        <li>Optional academic support services</li>
      </ul>
      <p className="text-lg text-gray-700">
        <strong>All services are delivered digitally.</strong> There is no physical shipping or delivery. Access is provided via user accounts on the CAPS360 platform.
      </p>
    </div>
  </section>
);

export default WhatCAPS360Offers;
