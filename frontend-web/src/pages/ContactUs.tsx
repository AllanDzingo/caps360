import React from 'react';

const ContactUs: React.FC = () => (
  <section className="py-16 bg-white">
    <div className="container mx-auto px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-brand-blue">Contact Us</h1>
      <p className="mb-4 text-gray-700">For support or business inquiries, please contact us:</p>
      <ul className="mb-4 text-gray-700">
        <li><strong>Business Name:</strong> CAPS360</li>
        <li><strong>Support Email:</strong> <a href="mailto:support@caps360.co.za" className="text-brand-blue underline">support@caps360.co.za</a></li>
        <li><strong>Business Region:</strong> South Africa</li>
        <li><strong>Support Response:</strong> We aim to respond within 2 business days.</li>
      </ul>
      <p className="text-gray-700">If you have any questions about our services, payments, or policies, please reach out. We are here to help.</p>
    </div>
  </section>
);

export default ContactUs;
