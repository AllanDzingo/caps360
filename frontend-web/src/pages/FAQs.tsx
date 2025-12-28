import React from 'react';

const FAQs: React.FC = () => (
  <section className="py-16 bg-white">
    <div className="container mx-auto px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-brand-blue">Frequently Asked Questions</h1>
      <h2 className="text-xl font-semibold mt-6 mb-2">How do payments work?</h2>
      <p className="mb-2 text-gray-700">Payments are made securely online for digital services. You can pay for subscriptions or once-off content using supported payment methods.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">What happens after payment?</h2>
      <p className="mb-2 text-gray-700">You receive instant access to purchased digital content or features via your CAPS360 account.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">How do I cancel my subscription?</h2>
      <p className="mb-2 text-gray-700">You can cancel your subscription anytime in your account settings. Access remains until the end of the paid period.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">How do refunds work?</h2>
      <p className="mb-2 text-gray-700">Refunds are available for unused digital services within 7 days. See our Refund Policy for details.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">How do I contact support?</h2>
      <p className="mb-2 text-gray-700">Email support@caps360.co.za. We aim to respond within 2 business days.</p>
      <p className="mt-8 text-gray-500 text-sm">Last updated: December 2025</p>
    </div>
  </section>
);

export default FAQs;
