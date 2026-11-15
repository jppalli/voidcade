/**
 * Event tracking for balancing and live operations.
 *
 * Events are small named records (level_start, item_found, coins_earned ...). They always go to a
 * short in-memory log, and to Azure Application Insights once ANALYTICS_KEY is filled in. It is
 * empty on purpose: this game should have its own Application Insights resource rather than share
 * Kitty Doku's. With no key nothing leaves the browser.
 *
 * Open the page with ?debug to see the events in the console.
 */
export const ANALYTICS_KEY = '';

type Props = Record<string, string | number | boolean>;

const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
const queue: { name: string; props: Props }[] = [];
let sink: ((name: string, props: Props) => void) | null = null;

/** Records an event. Never throws: the game must not care whether analytics works. */
export function track(name: string, props: Props = {}) {
  try {
    if (debug) console.info('[needle event]', name, props);
    if (sink) sink(name, props);
    else if (ANALYTICS_KEY && queue.length < 200) queue.push({ name, props });
  } catch {
    /* ignore */
  }
}

/** Connects Application Insights (a separate chunk, loaded only when there is a key). */
export async function initAnalytics() {
  if (!ANALYTICS_KEY) return;
  try {
    const { ApplicationInsights } = await import('@microsoft/applicationinsights-web');
    const ai = new ApplicationInsights({
      config: { instrumentationKey: ANALYTICS_KEY, disableFetchTracking: true, disableAjaxTracking: true, autoTrackPageVisitTime: false, enableAutoRouteTracking: false },
    });
    ai.loadAppInsights();
    sink = (name, props) => ai.trackEvent({ name: `needle_${name}` }, props);
    for (const e of queue.splice(0)) sink(e.name, e.props);
  } catch (e) {
    console.warn('[needle] analytics unavailable', e);
  }
}
