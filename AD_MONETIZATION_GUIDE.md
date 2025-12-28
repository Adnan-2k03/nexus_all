# Ad Monetization & Credits System Guide

## Overview
This document outlines all AdMob ad placements, credit earnings, and feature costs in NexusMatch.

---

## 📺 AD PLACEMENTS & TRIGGERS

### 1. **Rewarded Ads** ⭐⭐⭐ (PRIMARY EARNING SOURCE)
**Location:** Rewarded Ads Page (`/earn`)
**Trigger:** User manually clicks "Watch Ad & Earn 5 Credits" button
**Credits Earned:** **5 credits per ad**
**Cooldown:** 30 seconds between ads
**Daily Limit:** No limit
**Ad Unit ID:** `ca-app-pub-4278995521540923/8211109962`
**Implementation:** `showRewardedAd()`

```
Flow:
User clicks "Watch Ad & Earn 5 Credits" 
  → Ad plays (3-5 seconds)
  → User gets 5 credits immediately
  → 30-second cooldown before next ad
  → Can repeat unlimited times daily
```

---

### 2. **Rewarded Interstitial Ads** ⭐⭐⭐ (HIGH PRIORITY)
**Location:** Between match rounds & tournament transitions
**Trigger:** Automatic (after match completes, between tournament rounds)
**Credits Earned:** **5 credits per ad** (if user watches to completion)
**Format:** Full-screen ad with reward
**Ad Unit ID:** `ca-app-pub-4278995521540923/4127183271`
**Implementation:** `showRewardedInterstitialAd()`

```
Flow:
Match ends/Tournament round completes
  → Rewarded Interstitial shown (optional for user)
  → If user watches: +5 credits
  → If user dismisses: No reward
  → Game resumes
```

**Recommended Placements:**
- After match round completes
- Before tournament results screen
- During daily check-in rewards
- After earning XP milestones

---

### 3. **Interstitial Ads** ⭐⭐ (MEDIUM PRIORITY)
**Location:** Non-rewarding breaks in gameplay
**Trigger:** Automatic (after match ends, exiting tournament, between levels)
**Credits Earned:** **0 credits** (No reward)
**Format:** Full-screen ad (non-rewarding)
**Ad Unit ID:** `ca-app-pub-4278995521540923/4322802007`
**Implementation:** `showInterstitialAd()`

```
Flow:
User exits tournament / Match ends
  → Full-screen interstitial shown
  → User waits or closes ad
  → 0 credits earned
  → Game/app resumes
```

**Recommended Placements:**
- After exiting a tournament
- After completing a match
- Between gameplay levels
- Before profile page
- During app navigation pauses

---

### 4. **Banner Ads** ⭐ (BASELINE)
**Location:** Bottom of screen (Mobile only)
**Trigger:** Automatic on app load
**Credits Earned:** **0 credits** (No reward)
**Format:** 320x50 banner
**Ad Unit ID:** `ca-app-pub-3940256099942544/6300978111` (test)
**Implementation:** `showBannerAd()` / `hideBannerAd()`

```
Flow:
App loads on native mobile
  → Banner ad shown at bottom
  → Persistent throughout session
  → User can still interact with app
  → 0 credits earned
```

---

## 💰 CREDIT COSTS & FEATURES

### Feature Requirements

| Feature | Cost | Description |
|---------|------|-------------|
| **Post a Match** | 5 credits | Post LFG/LFO match request |
| **Boost Portfolio** | 50 credits | Boost match to top visibility for 24 hours |
| **Pro Subscription** | 500 credits | 10 connection requests per day |
| **Gold Subscription** | 1500 credits | 50 connection requests per day |
| **Default Tournament Prize Pool** | 100 credits | Starting prize pool for created tournaments |

### Cost Analysis

**Most Efficient Earning Path:**
```
1 Rewarded Ad = 5 credits
  - Post 1 Match costs 5 credits = 1 ad watched
  - Boost Portfolio costs 50 credits = 10 ads watched
  - Pro Subscription costs 500 credits = 100 ads watched
  - Gold Subscription costs 1500 credits = 300 ads watched
```

**Daily Earning Example (No Ad Limit):**
```
Conservative (10 ads/day):
  10 ads × 5 credits = 50 credits/day
  = 1 tournament prize pool per day
  = 1 boost per day

Active (30 ads/day):
  30 ads × 5 credits = 150 credits/day
  = 3 tournament prize pools per day
  = 3 boosts per day

Very Active (100 ads/day):
  100 ads × 5 credits = 500 credits/day
  = Can get Pro Subscription every 1 day
```

---

## 🎯 RECOMMENDED AD PLACEMENT STRATEGY

### Phase 1: Natural Breaks (Week 1)
- Show **Interstitial Ads** after each match
- Show **Rewarded Interstitial Ads** after tournament completion
- Keep banner ads visible at all times

### Phase 2: Optional Rewards (Week 2+)
- Promote **Rewarded Ads Page** in navigation
- Add "Watch Ad" button in various screens
- Show **Rewarded Interstitial** between critical transitions

### Phase 3: Optimized UX (Week 3+)
- Show **Interstitial** on natural breaks
- Show **Rewarded Interstitial** on high-engagement moments
- Monitor user engagement and ad frequency
- Avoid ad fatigue (max 5-6 ads per 30-minute session)

---

## 🔧 API ENDPOINTS

### Get User Credits
```
GET /api/user/credits
Response: { balance: number }
```

### Reward Ad Credits
```
POST /api/credits/reward-ad
Response: { balance: number }
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [x] Rewarded Ads implemented (5 credits per ad)
- [x] Rewarded Interstitial Ads added (ad unit configured)
- [x] Interstitial Ads implemented
- [x] Banner Ads showing on mobile
- [x] Credit system working
- [ ] Add Rewarded Interstitial trigger on match completion
- [ ] Add Interstitial trigger after tournament exit
- [ ] Create reward incentive messaging
- [ ] Track ad performance metrics
- [ ] Monitor user engagement & ad frequency

---

## 📊 PERFORMANCE NOTES

**Test Ad Units (for development):**
```
Banner: ca-app-pub-3940256099942544/6300978111
Interstitial: ca-app-pub-3940256099942544/1033173712
Rewarded: ca-app-pub-3940256099942544/5224354917
Rewarded Interstitial: ca-app-pub-3940256099942544/5354046152
```

**Production Ad Units (when ready):**
```
Banner: ca-app-pub-4278995521540923/9530455718
Interstitial: ca-app-pub-4278995521540923/4322802007
Rewarded: ca-app-pub-4278995521540923/8211109962
Rewarded Interstitial: ca-app-pub-4278995521540923/4127183271
```

**App ID:**
```
ca-app-pub-4278995521540923~8773515735
```

---

## 🚀 NEXT STEPS

1. **Test on device** - Switch to test ad units and test all ad types
2. **Measure engagement** - Track rewarded ad completion rates
3. **Optimize placement** - A/B test different ad placement strategies
4. **Monitor eCPM** - Track revenue performance in AdMob dashboard
5. **User feedback** - Gather user feedback on ad frequency
6. **Gradual rollout** - Start with fewer ads, increase based on engagement

---

**Last Updated:** December 28, 2025
**App:** NexusMatch
**AdMob Account:** ca-app-pub-4278995521540923
