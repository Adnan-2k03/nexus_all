# Google Play Store Data Safety Form Answers

## Data Collection and Security

### Question 1: Does your app collect or share any of the required user data types?
**Answer:** ✅ **Yes**

---

### Question 2: Is all of the user data collected by your app encrypted in transit?
**Answer:** ✅ **Yes**

---

### Question 3: Which of the following methods of account creation does your app support?
**Check the following boxes:**
- ✅ **OAuth** (Google, Discord)
- ✅ **Username and other authentication** (Custom gamertag-based login)

---

### Question 4: Add a link that users can use to request that their account and associated data is deleted

**Delete Account URL:** `https://nexusfinal-android.vercel.app/data-deletion-request`

Or when on your app: Navigate to Settings → Account & Data Management → Request Account Deletion

**What this page includes:**
- Clear explanation of what data gets deleted
- What data might be retained (for legal compliance)
- 30-day processing timeline
- Contact email for support
- Permanent deletion confirmation button

---

### Question 5: Do you provide a way for users to request that some or all of their data is deleted without requiring them to delete their account?
**Answer:** ✅ **Yes** (Check this if you want to be more privacy-forward)

---

## Data Types to Disclose

### ✅ CHECK THESE (Nexus Match collects):

**Personal Information:**
- ✅ Name
- ✅ Email address
- ✅ User IDs
- ✅ Address (optional - if users provide location for finding local players)

**Photos and Videos:**
- ✅ Photos (profile pictures/avatars)

**Audio Files:**
- ✅ Voice or sound recordings (WebRTC voice chat for team coordination)

**Messages:**
- ✅ Other in-app messages (chat between matched players)

**Device or Other IDs:**
- ✅ Device or other IDs (needed for authentication & device tracking)

**App Activity:**
- ✅ App activity (user actions: match creation, acceptance, decline, etc.)
- ✅ App interactions (button clicks, feature usage, etc.)
- ✅ Other actions (general user behavior within the app)

**In-app Search:**
- ✅ In-app search history (if you have search for games/players/teams)

**App Info & Performance:**
- ✅ Crash logs (for debugging)
- ✅ Diagnostics (app performance metrics)
- ✅ Other app performance data (stability metrics)

### ❌ DO NOT CHECK THESE (Nexus Match doesn't collect):

- ❌ Calendar
- ❌ Calendar events
- ❌ Contacts (you don't access device contact list)
- ❌ Installed apps
- ❌ Other user-generated content (unless game reviews/tournament descriptions count)
- ❌ Web browsing
- ❌ Web browsing history
- ❌ Location (unless you're using precise location - just keep "optional")
- ❌ Financial info (no payments on the platform)
- ❌ Health and fitness
- ❌ Emails/SMS/MMS (only in-app messages)
- ❌ Videos (only if users don't upload gameplay videos)
- ❌ Music files
- ❌ Files and docs

---

## Security Practices to Highlight

When filling out security measures:
- ✅ HTTPS/TLS encryption for all data in transit
- ✅ End-to-end encryption for voice (WebRTC)
- ✅ Secure password storage with hashing
- ✅ Authentication tokens
- ✅ Regular security practices

---

## Recommended Play Store Listing Text

Add to your app description or privacy section:

> **Data Privacy:**
> Nexus Match is committed to protecting your privacy. We encrypt all data in transit, support OAuth authentication, and allow you to request account and data deletion at any time. For more information, see our [Privacy Policy](https://nexusfinal-android.vercel.app/privacy-policy) or request deletion at [Delete Account](https://nexusfinal-android.vercel.app/data-deletion-request).

---

## Additional Notes

1. **Deletion URL:** The URL should be publicly accessible and work for both authenticated and unauthenticated users (or redirect to login)
2. **Processing Time:** We promise 30-day processing for deletion requests
3. **Data Retention:** Some data may be kept for:
   - Legal/fraud investigation (up to 2 years if required)
   - Tax purposes (up to 7 years if required)
   - Safety reports (indefinitely for user protection)
4. **Communication:** Users will receive confirmation of their deletion request
