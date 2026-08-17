# Owner steps after this ready-to-apply release

> Private Preflight now has the public trust, content, crawl, and inactive advertising boundaries required before an account application. This file does not activate advertising, prove legal compliance, or guarantee acceptance by any network.

## 1. Complete the account-owned steps

Create or use the site owner’s Google AdSense account, enter the identity and payment information only in the owner’s account, and follow its ownership-verification instructions for the published domain. Use Google Search Console to submit the published sitemap URL:

```text
https://mohummadsultan0-sudo.github.io/private-preflight/sitemap.xml
```

No visitor file data, CSV value, metadata value, or image pixel needs to be supplied for this procedure.

## 2. Configure consent before enabling any ad code

Choose and configure a CMP that satisfies the applicable requirements for the site’s real audience and advertising product. Check its live consent, rejection, revocation, provider disclosure, and regional behavior before configuring the frontend. This release deliberately does **not** load a CMP or advertising tag yet.

## 3. Configure the guarded ad slots only after approval and CMP verification

The application will load AdSense only when all of the following build-time values are set to real values by the site owner or deployment administrator:

| Variable | Required value |
| --- | --- |
| `VITE_ADSENSE_ENABLED` | `true` |
| `VITE_ADSENSE_CONSENT_MODE` | `configured` only after the CMP has been validated |
| `VITE_ADSENSE_PUBLISHER_ID` | Real publisher ID, formatted `ca-pub-…` |
| `VITE_ADSENSE_SLOT_SUPPORTING_CONTENT` | Real approved slot ID for content beneath the tool explanation |
| `VITE_ADSENSE_SLOT_FIELD_LIBRARY` | Real approved slot ID for the field-library page |

The guarded component renders nothing when any value is absent or invalid. It has no slot beside file picking, file inspection, local download, error recovery, or batch processing.

## 4. Publish the exact ads.txt record supplied by the account

After AdSense provides the exact publisher record, create `/ads.txt` with that exact line. Do not publish a guessed publisher ID or a placeholder record. Rebuild and verify `https://mohummadsultan0-sudo.github.io/private-preflight/ads.txt` after publishing.

## References

1. [Google AdSense: Website monetization tips](https://adsense.google.com/start/resources/monetization-tips-to-optimize-google-adsense/)
2. [Google: EU user consent policy](https://www.google.com/about/company/user-consent-policy/)
3. [Google AdSense Help: Set up and manage your CMP](https://support.google.com/adsense/answer/7670013?hl=en)
