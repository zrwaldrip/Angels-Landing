import Header from '../components/Header';

function UnauthorizedPage() {
  return (
    <div className="container mt-4">
      <Header />
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="alert alert-danger" role="alert">
            <h2 className="h5 mb-2">Access denied</h2>
            <p className="mb-0">
              Your account does not have a mapped role for this portal. Please reach out to an administrator for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
