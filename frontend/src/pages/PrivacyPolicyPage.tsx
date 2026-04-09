import Header from '../components/Header';

function PrivacyPolicyPage() {
  return (
    <div className="container policy-page">
      <Header />
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm text-start">
            <div className="card-body p-4 p-lg-5">
              <h2 className="h3 mb-3">Angels' Landing Privacy Policy</h2>
              <p className="text-muted mb-1">Effective date: April 9, 2026</p>
              <p>
                This Privacy Policy explains what information Angels&apos; Landing collects through this website and platform, how it is used, and
                how it is protected. This system is used for internal operations, donor management, reporting, and authorized case-management
                workflows.
              </p>

              <h3 className="h5 mt-4">Information we collect</h3>
              <ul>
                <li>
                  <strong>Account and access data:</strong> name, email, role, login and authentication-related information required to secure the
                  platform.
                </li>
                <li>
                  <strong>Operations and case data:</strong> records related to residents, safehouses, incident reports, intervention plans, home
                  visitations, health records, education records, partners, and process recordings.
                </li>
                <li>
                  <strong>Donation and supporter data:</strong> supporter profile details, donation history, channel and campaign information, and
                  related administrative notes.
                </li>
                <li>
                  <strong>Technical and security data:</strong> system logs and metadata needed to maintain availability, troubleshoot issues, and
                  protect accounts and data.
                </li>
              </ul>

              <h3 className="h5 mt-4">How we use information</h3>
              <ul>
                <li>To authenticate users and enforce role-based access (for example, donor vs. admin access).</li>
                <li>To provide and operate core features such as case tracking, reporting dashboards, and donation management.</li>
                <li>To monitor quality, prevent misuse, and investigate security incidents.</li>
                <li>To support internal analytics, service planning, and operational decision-making.</li>
                <li>To comply with legal, regulatory, and safeguarding requirements.</li>
              </ul>

              <h3 className="h5 mt-4">How information is shared</h3>
              <ul>
                <li>Data is shared internally only with authorized personnel who need it for their role.</li>
                <li>We do not sell personal information.</li>
                <li>
                  We do not use third-party advertising trackers on this platform. Data may be processed by essential infrastructure/service
                  providers only to operate, secure, and maintain the system.
                </li>
                <li>Information may be disclosed when required by law, court order, or legitimate safeguarding obligations.</li>
              </ul>

              <h3 className="h5 mt-4">Data retention</h3>
              <p>
                We retain information only as long as needed for operational, legal, audit, and safeguarding purposes. Retention periods may differ
                by data type (for example, finance records, case records, or account logs).
              </p>

              <h3 className="h5 mt-4">Security</h3>
              <p>
                We use administrative, technical, and access-control safeguards designed to protect data from unauthorized access, alteration,
                disclosure, or loss. No system is 100% risk-free, but we continuously improve controls based on operational and security needs.
              </p>

              <h3 className="h5 mt-4">Your choices and rights</h3>
              <ul>
                <li>You may request access to, correction of, or deletion of personal information where applicable by law.</li>
                <li>Authorized users can update some profile/account fields directly within the platform.</li>
                <li>Rights may be limited where retention is required for legal, audit, or safeguarding obligations.</li>
              </ul>

              <h3 className="h5 mt-4">Policy updates</h3>
              <p className="mb-0">
                We may update this policy as features and legal obligations evolve. Material updates will be reflected on this page with a revised
                effective date.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
