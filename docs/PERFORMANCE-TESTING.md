# FirstMan performance testing guide

This guide covers the live application at:

- Public website: `https://firstmancorp.com/`
- Staff login: `https://firstmancorp.com/login`
- Authenticated CRM: `https://firstmancorp.com/dashboard`

## 1. Test safely

Lighthouse, Chrome Performance recordings, and normal browser navigation are safe to run against
production. Load, stress, spike, and endurance tests are not. Run traffic-generating tests against
staging unless the production owner has approved the concurrency, duration, time window, and
monitoring plan.

Use a dedicated test staff account for authenticated checks. Never place credentials, session
cookies, client documents, or customer data in a test report.

## 2. Public website: PageSpeed Insights

Use PageSpeed Insights for public pages because it combines a Lighthouse lab test with Chrome field
data when enough real-user data exists.

1. Open `https://pagespeed.web.dev/`.
2. Enter `https://firstmancorp.com/`.
3. Run the analysis.
4. Record both **Mobile** and **Desktop** results.
5. Repeat for representative public routes:
   - `/services`
   - `/pricing`
   - `/contact`
   - one important service-detail route

Field data describes real visitors over time. Lab data is a controlled diagnostic run. Do not treat
one Lighthouse score as field performance.

## 3. Login and dashboard: authenticated Lighthouse

Public scanners cannot sign in to the CRM, so test these pages in Chrome with an authenticated
session.

1. Open a Chrome Incognito window to reduce extension noise.
2. Visit `https://firstmancorp.com/login` and sign in with a test account.
3. Navigate to the target CRM route.
4. Open DevTools with `F12`.
5. Open **Lighthouse**.
6. Select **Navigation**, **Mobile**, and **Performance**.
7. Click **Analyze page load**.
8. Repeat three times and report the median result.
9. Repeat on **Desktop**.

Recommended CRM route sample:

| Area | Route |
| --- | --- |
| Login | `/login` |
| Dashboard | `/dashboard` |
| Enquiries | `/enquiries` |
| Clients | `/clients` |
| Catalogue | `/catalog` |
| Job cards | `/orders` |
| Compliance | `/compliance` |

Test at least one populated detail page as well as each list page. Large tables, charts, documents,
and long activity histories may behave differently from empty states.

## 4. Performance targets

Use the following release targets:

| Metric | Good target | Notes |
| --- | ---: | --- |
| Lighthouse Performance | 90+ | Diagnostic score, not a Core Web Vital |
| Largest Contentful Paint (LCP) | 2.5 seconds or less | Main-content loading |
| Cumulative Layout Shift (CLS) | 0.1 or less | Visual stability |
| Interaction to Next Paint (INP) | 200 ms or less | Real-user responsiveness |
| Total Blocking Time (TBT) | 200 ms or less | Lighthouse lab proxy for INP |

Judge field Core Web Vitals at the 75th percentile. Lighthouse cannot directly measure INP because
an ordinary navigation audit does not reproduce real user interactions; use TBT for lab diagnosis
and field telemetry for INP.

## 5. Test interactions with Chrome Performance

Lighthouse primarily measures page loading. Use the **Performance** panel for CRM interactions:

1. Open DevTools → **Performance**.
2. Enable screenshots and Web Vitals.
3. Start recording.
4. Perform one realistic workflow, such as:
   - search and filter enquiries;
   - open a client and change tabs;
   - open a job card and update a task status;
   - move between compliance list and calendar;
   - open the global search dialog.
5. Stop recording.
6. Inspect long tasks, layout shifts, repeated renders, large scripting blocks, and slow requests.

Investigate main-thread tasks longer than 50 ms. Record the interaction, route, device profile, and
the longest task rather than reporting only a general score.

## 6. Cold and warm navigation

Measure both conditions:

- **Cold navigation:** new Incognito session or cache disabled. This exposes initial JavaScript,
  fonts, images, and server response time.
- **Warm navigation:** revisit the page with browser cache enabled. This represents normal repeated
  CRM use.

Keep test conditions consistent. Compare mobile results only with other mobile results using the
same throttling profile.

## 7. Quick server timing check

The following PowerShell command measures the public homepage response without downloading the
body to disk:

```powershell
curl.exe -s -o NUL -w "DNS: %{time_namelookup}s`nConnect: %{time_connect}s`nTTFB: %{time_starttransfer}s`nTotal: %{time_total}s`nStatus: %{http_code}`n" https://firstmancorp.com/
```

Run it five times and use the median. This isolates network/server timing but does not measure
rendering, JavaScript, interaction latency, or visual stability. Calling `/dashboard` without an
authenticated cookie measures only its redirect or login response, not dashboard performance.

## 8. Production monitoring

Lab tests catch regressions before release; production monitoring shows what users experience.
Capture LCP, INP, and CLS from real sessions and group them by route, device class, and release.
Use the 75th percentile and require sufficient samples before drawing conclusions.

Also monitor:

- server response time and error rate;
- database query duration;
- slow external services;
- JavaScript errors;
- route-specific Web Vitals;
- deployment-to-deployment changes.

## 9. Reporting template

Use one row per route and device:

| Date | Release | Route | Device | Run 1 | Run 2 | Run 3 | Median | LCP | CLS | TBT | Notes |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| YYYY-MM-DD | commit/tag | `/dashboard` | Mobile |  |  |  |  |  |  |  |  |

Attach the Lighthouse HTML report and list the three highest-impact opportunities. Avoid optimizing
small diagnostics before fixing slow server responses, large render-blocking resources, excessive
JavaScript, or an unstable LCP element.

## 10. Release gate

Before approving a release:

- production build completes;
- representative public and authenticated routes have no Lighthouse regression greater than five
  points from the stored baseline;
- LCP and CLS meet the targets above in lab tests;
- no new long task blocks a primary CRM interaction;
- mobile pages have no horizontal page overflow;
- production error rate and response time remain within their normal range after deployment.

Do not block a release on a single noisy Lighthouse run. Re-run three times under the same
conditions and compare medians.

## References

- [Chrome Lighthouse overview](https://developer.chrome.com/docs/lighthouse/overview)
- [Getting started with measuring Web Vitals](https://web.dev/articles/vitals-measurement-getting-started)
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [Next.js production checklist](https://nextjs.org/docs/pages/guides/production-checklist)
