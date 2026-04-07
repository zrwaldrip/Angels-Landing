import Header from '../components/Header';

function CookiePolicyPage() {
  return (
    <div className="container mt-4">
      <Header />
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm text-start">
            <div className="card-body p-4 p-lg-5">
              <h2 className="h3 mb-3">Angels' Landing Cookie Policy</h2>
              <p className="text-muted">
                Angels' Landing uses a small set of essential cookies to keep secure authentication working.
              </p>
              <h3 className="h5 mt-4">Essential cookies used by this app</h3>
              <ul>
                <li>The ASP.NET Core Identity application cookie keeps the user signed in after a successful login.</li>
                <li>This banner stores a local acknowledgement flag in your browser so the notice does not reappear on every page load.</li>
              </ul>
              <h3 className="h5 mt-4">What we don't do</h3>
              <ul>
                <li>No analytics cookies</li>
                <li>No advertising cookies</li>
                <li>No cross-site tracking scripts</li>
              </ul>
              <h3 className="h5 mt-4">Note</h3>
              <p className="mb-0">
                Legal requirements depend on your jurisdiction and audience. This policy is intended for the Angels' Landing application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookiePolicyPage;
