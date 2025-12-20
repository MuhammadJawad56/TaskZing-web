import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "TaskZing Terms and Conditions",
};

export default function TermsConditionsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-theme-primaryText mb-8">Terms & Conditions</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-theme-primaryText">
          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Agreement to Terms</h2>
            <p className="text-theme-accent4">
              By accessing and using TaskZing, you agree to be bound by these Terms and Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">User Responsibilities</h2>
            <p className="text-theme-accent4">
              Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Service Availability</h2>
            <p className="text-theme-accent4">
              We reserve the right to modify, suspend, or discontinue any part of our service at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Limitation of Liability</h2>
            <p className="text-theme-accent4">
              TaskZing shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Contact Us</h2>
            <p className="text-theme-accent4">
              If you have any questions about these Terms and Conditions, please contact us at legal@taskzing.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

