import React from 'react';

const ServiceDeliveryPolicy: React.FC = () => (
  <section className="py-16 bg-white">
    <div className="container mx-auto px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-brand-blue">Service Delivery Policy</h1>
      <p className="mb-4 text-gray-700">All CAPS360 services are delivered digitally. There is no physical shipping or delivery of goods.</p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Access to digital content and features is provided via your CAPS360 account.</li>
        <li>Service is available immediately after payment confirmation.</li>
        <li>No physical products are shipped or delivered.</li>
      </ul>
      <p className="text-gray-700">If you have questions about service delivery, contact support@caps360.co.za.</p>
      <p className="mt-8 text-gray-500 text-sm">Last updated: December 2025</p>
    </div>
  </section>
);

export default ServiceDeliveryPolicy;
