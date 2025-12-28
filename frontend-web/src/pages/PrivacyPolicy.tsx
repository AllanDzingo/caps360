import React from 'react';

const PrivacyPolicy: React.FC = () => (
  <section className="py-16 bg-white">
    <div className="container mx-auto px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-brand-blue">Privacy Policy</h1>
      <p className="mb-4 text-gray-700">Your privacy is important to us. This policy explains how CAPS360 collects, uses, and protects your personal data.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">1. Data Collected</h2>
      <p className="mb-2 text-gray-700">We collect account information, usage data, and payment details for service delivery and analytics. No unnecessary data is collected.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">2. Data Storage & Protection</h2>
      <p className="mb-2 text-gray-700">Your data is stored securely using industry-standard encryption. Access is restricted to authorized personnel only.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">3. Third-Party Services</h2>
      <p className="mb-2 text-gray-700">We use trusted third-party providers (e.g., Paystack for payments, cloud hosting) who comply with data protection laws.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">4. User Rights</h2>
      <p className="mb-2 text-gray-700">You may request access, correction, or deletion of your data at any time. Contact support@caps360.co.za for requests.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">5. POPIA Compliance</h2>
      <p className="mb-2 text-gray-700">CAPS360 complies with the Protection of Personal Information Act (POPIA) of South Africa. We respect your privacy rights and process data lawfully.</p>
      <p className="mt-8 text-gray-500 text-sm">Last updated: December 2025</p>
    </div>
  </section>
);

export default PrivacyPolicy;
