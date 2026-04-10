import { FormEvent, useMemo, useState } from 'react';
import Header from '../components/Header';
import {
  predictSocialEngagementWhatIf,
  type SocialEngagementWhatIfRequest,
} from '../lib/mlApi';

const PLATFORM_OPTIONS = ['Facebook', 'Instagram', 'TikTok', 'YouTube', '(missing)'];
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', '(missing)'];
const POST_TYPE_OPTIONS = ['Post', 'Story', 'Reel', 'Short', 'Video', '(missing)'];
const MEDIA_TYPE_OPTIONS = ['Image', 'Carousel', 'Video', 'Text', '(missing)'];
const CTA_TYPE_OPTIONS = ['Donate', 'Volunteer', 'Share', 'LearnMore', 'SignUp', '(missing)'];
const TOPIC_OPTIONS = [
  'ResidentStory',
  'Fundraising',
  'Event',
  'Awareness',
  'ThankYou',
  'Announcement',
  '(missing)',
];

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function SocialEngagementPredictorPage() {
  const [form, setForm] = useState<SocialEngagementWhatIfRequest>({
    platform: '(missing)',
    day_of_week: '(missing)',
    post_type: '(missing)',
    media_type: '(missing)',
    call_to_action_type: '(missing)',
    content_topic: '(missing)',
    post_hour: 12,
    num_hashtags: 0,
    mentions_count: 0,
    caption_length: 0,
    has_call_to_action: false,
    is_boosted: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prediction, setPrediction] = useState<number | null>(null);

  const canSubmit = useMemo(() => !loading, [loading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPrediction(null);
    try {
      const result = await predictSocialEngagementWhatIf(form);
      setPrediction(result.predictedEngagementRate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to predict engagement right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mt-2">
      <Header />
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h2 className="h4 mb-0">Social Engagement Predictor (What-if)</h2>
          </div>
          <p className="text-muted small mb-3">
            Enter a hypothetical post using <strong>controllable</strong> design levers only. This predicts{' '}
            <code>engagement_rate</code> based on historical patterns and excludes audience-scale drivers (impressions,
            followers) by design.
          </p>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Platform</label>
                <select
                  className="form-select"
                  value={form.platform}
                  onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                >
                  {PLATFORM_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Day of week</label>
                <select
                  className="form-select"
                  value={form.day_of_week}
                  onChange={(e) => setForm((p) => ({ ...p, day_of_week: e.target.value }))}
                >
                  {DAY_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Post hour (0–23)</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  max={23}
                  value={form.post_hour}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, post_hour: clampInt(Number(e.target.value || 0), 0, 23) }))
                  }
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Post type</label>
                <select
                  className="form-select"
                  value={form.post_type}
                  onChange={(e) => setForm((p) => ({ ...p, post_type: e.target.value }))}
                >
                  {POST_TYPE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Media type</label>
                <select
                  className="form-select"
                  value={form.media_type}
                  onChange={(e) => setForm((p) => ({ ...p, media_type: e.target.value }))}
                >
                  {MEDIA_TYPE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Content topic</label>
                <select
                  className="form-select"
                  value={form.content_topic}
                  onChange={(e) => setForm((p) => ({ ...p, content_topic: e.target.value }))}
                >
                  {TOPIC_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">CTA type</label>
                <select
                  className="form-select"
                  value={form.call_to_action_type}
                  onChange={(e) => setForm((p) => ({ ...p, call_to_action_type: e.target.value }))}
                >
                  {CTA_TYPE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label"># hashtags</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  max={50}
                  value={form.num_hashtags}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, num_hashtags: clampInt(Number(e.target.value || 0), 0, 50) }))
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Mentions count</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  max={50}
                  value={form.mentions_count}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, mentions_count: clampInt(Number(e.target.value || 0), 0, 50) }))
                  }
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Caption length (characters)</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  max={5000}
                  value={form.caption_length}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, caption_length: clampInt(Number(e.target.value || 0), 0, 5000) }))
                  }
                />
                <div className="form-text">If unknown, leave 0.</div>
              </div>

              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check">
                  <input
                    id="hasCta"
                    className="form-check-input"
                    type="checkbox"
                    checked={form.has_call_to_action}
                    onChange={(e) => setForm((p) => ({ ...p, has_call_to_action: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="hasCta">
                    Has CTA
                  </label>
                </div>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check">
                  <input
                    id="isBoosted"
                    className="form-check-input"
                    type="checkbox"
                    checked={form.is_boosted}
                    onChange={(e) => setForm((p) => ({ ...p, is_boosted: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="isBoosted">
                    Boosted
                  </label>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
              <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
                {loading ? 'Predicting…' : 'Predict engagement_rate'}
              </button>
              {prediction != null ? (
                <div className="alert alert-success mb-0 py-2 px-3">
                  Predicted <code>engagement_rate</code>: <strong>{prediction.toFixed(4)}</strong>
                </div>
              ) : null}
            </div>
          </form>

          <div className="small text-muted mt-3">
            Note: This is a forecast from historical data. It will be less reliable for brand-new formats, major platform
            algorithm shifts, or posts unlike anything in the training set.
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocialEngagementPredictorPage;

