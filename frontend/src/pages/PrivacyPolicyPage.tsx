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
              <p className="text-muted">
                Angels' Landing is committed to protecting the personal information collected through this application.
              </p>

              <h3 className="h5 mt-4">Information we collect</h3>
              <ul>
                <li>Account details such as email address and login credentials required for authentication.</li>
                <li>Operational data needed to manage residents, safehouses, donations, and case records.</li>
              </ul>

              <h3 className="h5 mt-4">How we use information</h3>
              <ul>
                <li>To provide secure access and maintain application functionality.</li>
                <li>To support case management and internal operational reporting.</li>
              </ul>

              <h3 className="h5 mt-4">Data sharing and tracking</h3>
              <ul>
                <li>No sale of personal data.</li>
                <li>No third-party advertising trackers.</li>
                <li>Data is shared only when required for system operation or legal compliance.</li>
              </ul>

              <h3 className="h5 mt-4">Note</h3>
              <p className="mb-0">
                Legal requirements vary by jurisdiction. Review this policy with legal counsel to ensure full compliance for your organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
