import React from 'react';

const RefundPolicy: React.FC = () => (
  <section className="py-16 bg-white">
    <div className="container mx-auto px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-brand-blue">Refund Policy</h1>
      <p className="mb-4 text-gray-700">CAPS360 aims for customer satisfaction. Please review our refund policy below.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">1. Eligibility for Refunds</h2>
      <p className="mb-2 text-gray-700">Refunds are available for digital services not accessed or used, within 7 days of purchase. Once digital content is accessed, refunds are not available.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">2. Refund Process</h2>
      <p className="mb-2 text-gray-700">To request a refund, contact support@caps360.co.za with your account and payment details. Refunds are processed to the original payment method within 7 business days if approved.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">3. Non-Refundable Scenarios</h2>
      <p className="mb-2 text-gray-700">Refunds are not available for digital content already accessed or for subscription periods already used.</p>
      <p className="mt-8 text-gray-500 text-sm">Last updated: December 2025</p>
    </div>
  </section>
);

export default RefundPolicy;
