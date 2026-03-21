// Terms.jsx

import React from 'react';

const Terms = () => {
  const effective = '10-23-2025';
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="opacity-80 mt-1 text-sm">Effective date: {effective}</p>

      <p className="mt-6">
        These Terms of Service (“Terms”) govern your use of <strong>locknclock</strong> (the “Service”).
        By using the Service, you agree to these Terms.
      </p>

      <h2 className="text-xl font-semibold mt-6">Accounts</h2>
      <p className="mt-2">
        You must provide accurate information and are responsible for activity on your account.
        You must promptly notify us of any unauthorized use.
      </p>

      <h2 className="text-xl font-semibold mt-6">Your content & ownership</h2>
      <p className="mt-2">
        You retain rights to the content you submit (tasks, subtasks, notes, entries). You grant us a limited,
        worldwide license to host and process that content solely to operate and improve the Service.
      </p>

      <h2 className="text-xl font-semibold mt-6">Hosting & third-party services</h2>
      <p className="mt-2">
        We do not run our own servers. The Service stores data in our project on
        {' '}<a className="underline" href="https://supabase.com/terms" target="_blank" rel="noreferrer">Supabase</a>.
        Your use of the Service therefore incorporates Supabase's platform; see their
        {' '}<a className="underline" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
        {' '}and{' '}
        <a className="underline" href="https://supabase.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>.
      </p>

      <h2 className="text-xl font-semibold mt-6">Acceptable use</h2>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>No unlawful, harmful, or abusive behavior.</li>
        <li>No interference with or disruption of the Service.</li>
        <li>No unauthorized access, scraping, or reverse engineering.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">Availability & changes</h2>
      <p className="mt-2">
        We may modify, suspend, or discontinue the Service (or features) with or without notice.
        We are not liable for outages or factors beyond our control.
      </p>

      <h2 className="text-xl font-semibold mt-6">Termination</h2>
      <p className="mt-2">
        You may stop using the Service at any time. We may suspend or terminate access if you breach these Terms
        or if necessary to protect the Service or comply with law.
      </p>

      <h2 className="text-xl font-semibold mt-6">Disclaimers</h2>
      <p className="mt-2">
        The Service is provided “as is” and “as available” without warranties of any kind, express or implied.
      </p>

      <h2 className="text-xl font-semibold mt-6">Limitation of liability</h2>
      <p className="mt-2">
        To the maximum extent permitted by law, we will not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of data, use, or profits.
      </p>

      <h2 className="text-xl font-semibold mt-6">Changes to these Terms</h2>
      <p className="mt-2">
        We may update these Terms from time to time. We will post the updated date and, for material changes,
        provide reasonable notice.
      </p>

      <h2 className="text-xl font-semibold mt-6">Contact</h2>
      <p className="mt-2">
        Questions? Email <a className="underline" href="mailto:itsahmedkhalil@gmail.com">itsahmedkhalil@gmail.com</a>.
      </p>
    </div>
  );
};

export default Terms;
