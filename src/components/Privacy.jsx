// Privacy.jsx

import React from 'react';

const Privacy = () => {
  const effective = '23-10-2025';
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="opacity-80 mt-1 text-sm">Effective date: {effective}</p>

      <p className="mt-6">
        This Privacy Policy explains how <strong>locknclock</strong> (“we”, “us”, “our”) collects,
        uses, and shares information about you when you use our website and services (the “Service”).
      </p>

      <h2 className="text-xl font-semibold mt-6">What we collect</h2>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li><strong>Account data</strong>: email address and authentication identifiers.</li>
        <li><strong>App data</strong>: timers, journal entries, tasks and subtasks you create, and related metadata.</li>
        <li><strong>Device/log data</strong>: basic logs (e.g., browser/OS, IP) for security and abuse prevention.</li>
        <li><strong>Cookies</strong>: strictly necessary cookies for sign-in/session management.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">Where your data lives</h2>
      <p className="mt-2">
        We do not run our own databases or servers. All Service data is stored in our project on
        <a className="underline ml-1" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a>,
        which processes data on our behalf. Supabase's legal terms and privacy practices are described in their
        <a className="underline ml-1" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> and
        <a className="underline ml-1" href="https://supabase.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>.
      </p>

      <h2 className="text-xl font-semibold mt-6">Access to your data</h2>
      <p className="mt-2">
        We design the Service so your data stays in Supabase. We do not sell your data. We do not
        read or use your content for advertising. Our team does not access your personal data
        except when necessary to operate the Service (e.g., support requests, security, or to
        comply with the law).
      </p>

      <h2 className="text-xl font-semibold mt-6">How we use information</h2>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>Provide core functionality (authentication, timers, tasks, history).</li>
        <li>Maintain security and prevent abuse.</li>
        <li>Respond to support requests and improve the Service.</li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">Sharing</h2>
      <p className="mt-2">
        We share data with service providers that process it for us (e.g., hosting/Supabase). We may disclose
        information if required by law or to protect rights, safety, and the Service. We do not sell your personal
        information.
      </p>

      <h2 className="text-xl font-semibold mt-6">Retention & deletion</h2>
      <p className="mt-2">
        We retain account and app data while your account is active. You can request deletion or export at any
        time by contacting us. When you delete data, we instruct Supabase to delete it from our project (subject
        to backup/retention periods maintained by Supabase).
      </p>

      <h2 className="text-xl font-semibold mt-6">Security</h2>
      <p className="mt-2">
        We use reasonable technical and organizational measures and rely on Supabase's platform security.
        Data is transmitted over TLS; Supabase provides encryption at rest and access controls. No method of
        transmission or storage is 100% secure.
      </p>

      <h2 className="text-xl font-semibold mt-6">International transfers</h2>
      <p className="mt-2">
        Supabase may store/process data in regions it supports. By using the Service you consent to such
        transfers. See Supabase's policies for details on regional hosting and safeguards.
      </p>

      <h2 className="text-xl font-semibold mt-6">Changes</h2>
      <p className="mt-2">
        We may update this Policy. We will post the new effective date and, for material changes, provide notice.
      </p>

      <h2 className="text-xl font-semibold mt-6">Contact</h2>
      <p className="mt-2">
        Questions or requests (access, export, deletion)? Email
        {' '}<a className="underline" href="mailto:itsahmedkhalil@gmail.com">itsahmedkhalil@gmail.com</a>.
      </p>
    </div>
  );
};

export default Privacy;
