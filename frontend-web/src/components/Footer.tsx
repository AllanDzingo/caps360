import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => (
  <footer className="bg-brand-navy text-white py-8 mt-12">
    <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
      <div className="mb-4 md:mb-0">
        <span className="font-bold">CAPS360</span> &copy; {new Date().getFullYear()} | Digital Education Platform
      </div>
      <nav className="flex flex-wrap gap-4 text-sm">
        <Link to="/what-caps360-offers" className="hover:underline">What CAPS360 Offers</Link>
        <Link to="/terms-and-conditions" className="hover:underline">Terms & Conditions</Link>
        <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
        <Link to="/refund-policy" className="hover:underline">Refund Policy</Link>
        <Link to="/faqs" className="hover:underline">FAQs</Link>
        <Link to="/service-delivery-policy" className="hover:underline">Service Delivery</Link>
        <Link to="/contact-us" className="hover:underline">Contact Us</Link>
      </nav>
    </div>
  </footer>
);

export default Footer;
