// Hostnames the nerdpack is served from when running in New Relic One.
const NR_ONE_HOSTNAMES = ['one.newrelic.com', 'one.eu.newrelic.com'];

// Hostname suffix used by New Relic One EU, eg. one.eu.newrelic.com
const NR_EU_HOSTNAME_SUFFIX = '.eu.newrelic.com';

// Matching on window.location.hostname rather than a substring of the full
// href avoids hosts like one.newrelic.com.evil.example being treated as ours.
export const getHostname = () =>
  (window?.location?.hostname || '').toLowerCase();

export const isLocalEnv = () => !NR_ONE_HOSTNAMES.includes(getHostname());

export const isEuRegion = () => {
  const hostname = getHostname();
  return (
    hostname === 'eu.newrelic.com' || hostname.endsWith(NR_EU_HOSTNAME_SUFFIX)
  );
};

// Header value expected by the optimizer backend, undefined outside of the EU.
export const getRegionHeader = () => (isEuRegion() ? 'EU' : undefined);
