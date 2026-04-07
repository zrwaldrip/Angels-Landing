import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getSafehouses, getSafehouseMetrics, type Safehouse, type SafehouseMetric } from '../lib/lighthouseAPI';

function SafehousesPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [metrics, setMetrics] = useState<SafehouseMetric[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) void load();
  }, [isAuthenticated, isLoading]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const sh = await getSafehouses();
      setSafehouses(sh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load safehouses.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics(id: number) {
    setSelectedId(id);
    try {
      const m = await getSafehouseMetrics(id);
      setMetrics(m);
    } catch { setMetrics([]); }
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="container mt-4">
        <Header />
        <div className="alert alert-warning">Please <Link to="/login">sign in</Link> to view safehouses.</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <Header />
      <h2 className="h4 mb-3">Safehouses</h2>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <div className="row g-3">
          {safehouses.map((sh) => (
            <div className="col-md-6 col-lg-4" key={sh.safehouseId}>
              <div className={`card shadow-sm h-100 ${selectedId === sh.safehouseId ? 'border-primary' : ''}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{sh.name}</h5>
                    <span className={`badge ${sh.status === 'Active' ? 'text-bg-success' : 'text-bg-secondary'}`}>{sh.status}</span>
                  </div>
                  <p className="text-muted small mb-1">{sh.city}, {sh.province}, {sh.country}</p>
                  <p className="text-muted small mb-2">{sh.region} • Code: {sh.safehouseCode}</p>
                  <div className="row text-center g-2 mb-3">
                    <div className="col-4">
                      <div className="bg-light rounded p-2">
                        <div className="fw-bold">{sh.currentOccupancy ?? 0}</div>
                        <small className="text-muted">Residents</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="bg-light rounded p-2">
                        <div className="fw-bold">{sh.capacityGirls ?? 0}</div>
                        <small className="text-muted">Capacity</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="bg-light rounded p-2">
                        <div className="fw-bold">{sh.capacityStaff ?? 0}</div>
                        <small className="text-muted">Staff Cap</small>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline-primary btn-sm w-100"
                    onClick={() => loadMetrics(sh.safehouseId)}
                  >
                    {selectedId === sh.safehouseId ? 'Metrics loaded ↓' : 'View monthly metrics'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly metrics panel */}
      {selectedId && metrics.length > 0 && (
        <div className="mt-4">
          <h3 className="h5">
            Monthly Metrics — {safehouses.find(s => s.safehouseId === selectedId)?.name}
            <button className="btn btn-link btn-sm ms-2" onClick={() => { setSelectedId(null); setMetrics([]); }}>
              Close
            </button>
          </h3>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>Month</th>
                  <th>Active Residents</th>
                  <th>Avg Health</th>
                  <th>Avg Education</th>
                  <th>Process Recordings</th>
                  <th>Home Visitations</th>
                  <th>Incidents</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.metricId}>
                    <td>{m.monthStart}</td>
                    <td>{m.activeResidents}</td>
                    <td>{m.avgHealthScore?.toFixed(1)}</td>
                    <td>{m.avgEducationProgress?.toFixed(1)}%</td>
                    <td>{m.processRecordingCount}</td>
                    <td>{m.homeVisitationCount}</td>
                    <td>{m.incidentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SafehousesPage;
