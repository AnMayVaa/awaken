# AWAKEN — research notes behind the design

AWAKEN tries to be fun **and** to produce real change. This page lists the evidence each feature leans on, and where we deliberately chose *not* to copy common app tricks.

## 1. Gamification works — modestly, and best when it's not the only thing

- A meta-analysis of 16 RCTs (2,407 people) found gamified interventions added roughly **+1,600 steps/day**. The effect shrank after the intervention ended (small but significant at 12–24-week follow-up). One-shot gamification isn't enough for lasting change. ([JMIR 2022](https://www.jmir.org/2022/1/E26779/))
- **Design response:** game mechanics wrap *real* behaviours with concrete finish lines. Life Score, check-ins and Main Quests track outcomes beyond XP. Ongoing variety comes from weekly challenges, a 341-quest library and AI quests, so the novelty doesn't wear off as fast.
- Extrinsic rewards can crowd out intrinsic motivation when they feel controlling (self-determination theory). AWAKEN shows *why* a quest matters (🧪 research notes), lets you choose focus areas, and treats rewards as celebration, not payment. ([Deci, Koestner & Ryan 1999](https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf))

## 2. Habits: the 66-day challenge

- In Lally et al. (96 people, 12 weeks), it took an average of **66 days** for a behaviour to become automatic, with a range of **18–254 days**. Missing one day **did not materially affect** habit formation. ([summary](https://jamesclear.com/new-habit))
- **Design response:** the 66-day grid, plus Streak Shields so one miss doesn't wipe progress. The companion tip says "don't miss twice".

## 3. Turning intentions into action

- **If-then plans** (implementation intentions): d = 0.65 across 94 studies. ([NCI summary of Gollwitzer & Sheeran 2006](https://cancercontrol.cancer.gov/brp/constructs/implementation_intentions/ii5.html))
- **WOOP / MCII** (mental contrasting + if-then plans): g = 0.34 across 21 articles, N = 15,907 (bias-adjusted ≈ 0.24). ([Wang et al. 2021, Frontiers](https://www.frontiersin.org/articles/10.3389/fpsyg.2021.565202/full))
- **Design response:** every Main Quest has an optional WOOP plan. Recovery tracks have an if-then plan. Purpose quests include "write 3 if-then plans".

## 4. Adaptive difficulty: aiming for ~80–85% success

- The "Eighty Five Percent Rule": learning is fastest when you fail about 15% of the time. The evidence comes from simple learning tasks, and the authors call for more research on complex skills. ([Wilson et al. 2019](https://www.sciencedaily.com/releases/2019/11/191105113457.htm))
- **Design response:** each life area has its own difficulty tier. Completing quests pushes it up, while skipping or expiring pushes it down, nudged toward ~82% success. Low mood or short sleep yesterday → gentler quests.

## 5. Wellbeing you can actually measure

- **WHO-5 Well-Being Index**: 5 items about the last two weeks, each scored 0–5. The raw total (0–25) × 4 gives a 0–100 score. A score of **≤ 50** is a common screening threshold that suggests checking further. ([PsyToolkit](https://www.psytoolkit.org/survey-library/who5.html))
- **Design response:** Life tab → Wellbeing check every 2 weeks, with a trend line. If the score is low, a gentle message suggests talking to someone and gives Thailand's 1323 hotline. It is a screening aid, never a diagnosis.
- The **Life Wheel** (self-rated 1–10 per area) is a coaching tool, not a validated scale. AWAKEN uses it to steer quests, and it makes up 35% of the Life Score.
- **Life Score** = 35% WHO-5 + 35% Life Wheel + 30% consistency (active days in the last 14). The breakdown is shown in the app.

## 6. Relationships & social life

- Couples who stayed married "turned toward" **86%** of bids for connection; those who divorced, **33%** (6-year follow-up). ([Gottman Institute](https://www.gottman.com/blog/turn-toward-instead-of-away/))
- Stronger social relationships → **50% higher likelihood of survival** (148 studies, 308,849 people). ([Holt-Lunstad 2010 summary](https://www.recoveryanswers.org/research-post/social-relationships-mortality-risk-2010-meta-analysis-review/))
- Three exercises — gratitude visit, "three good things" and using signature strengths in a new way — produced lasting gains in happiness. ([Seligman, Authentic Happiness](https://www.authentichappiness.sas.upenn.edu/node/104))
- **Design response:** Relationships quests (turn toward bids, gratitude letters, reconnecting, hosting) and the *Reconnect 30* campaign.

## 7. Career

- A 20-million-user LinkedIn experiment found **moderately weak ties** drive the most job mobility. ([MIT IDE](https://ide.mit.edu/insights/new-study-proves-that-weak-ties-have-strong-employment-value))
- **Design response:** "Weak-tie hello", informational interviews and the *Career Launch* campaign.

## 8. Body & sleep

- Mortality risk levels off at about **6–8k steps/day for adults 60+** and **8–10k for adults under 60**. ([Paluch 2022, EurekAlert](https://www.eurekalert.org/news-releases/945267))
- WHO: **150–300 min** of moderate activity per week, plus muscle strengthening **≥ 2 days/week**. ([ACE summary](https://www.acefitness.org/education-and-resources/professional/expert-articles/7751/who-releases-new-guidelines-on-physical-activity-and-sedentary-behavior))
- Adults need **≥ 7 hours** of sleep. Sleeping 6 or fewer is "inadequate to sustain health and safety". ([AASM](https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/))

## 9. Phone, doom-scrolling and other compulsive habits

- Limiting social media to **~30 min/day** for 3 weeks reduced loneliness and depression (143 students). ([Hunt 2018 via TechCrunch](https://techcrunch.com/2018/11/09/limiting-social-media-use-reduced-loneliness-and-depression-in-new-experiment))
- Notifications batched **3×/day** improved attention, productivity and mood. Turning them off entirely raised anxiety. ([Fitz 2019](https://communities.springernature.com/posts/batching-notifications-can-improve-attention-well-being-and-productivity))
- **Grayscale** cut smartphone use by ~39 min/day. ([University of Cincinnati](https://uc.edu/news/articles/2022/10/n21124601.html))
- The "one sec" friction app: a breathing pause before opening apps, with ~57% less usage after 6 weeks. This is a developer-led study. ([report](https://ca.news.yahoo.com/tried-app-promised-cure-addiction-111400731.html))
- **Relapse prevention (Marlatt):** a lapse is different from a relapse. The **abstinence violation effect** — shame after a slip ("I'm hopeless") — drives a full relapse. The recommended response is to treat the lapse as a learning event, delay acting on urges, and practise urge surfing. ([summary](https://open-exam-prep.com/study-guides/icrc-aadc/cbt-relapse-prevention/marlatt-relapse-prevention), [MBRP / urge surfing](https://socialworktoday.com/archive/MJ18p22.shtml))
- **ACT for problematic porn use:** in a small RCT (28 men, 12 sessions), viewing fell ~92% after treatment. ([Utah State University](https://cehs.usu.edu/news/2016/pornography-treatment))
- Self-compassion after failure increased motivation to improve. ([Breines & Chen 2012](https://pubmed.ncbi.nlm.nih.gov/22645164/))
- **Design response:** *Break Free* recovery mode:
  - The streak resets on a slip but **total clean days are kept**, and a slip costs no HP.
  - **Urge SOS** gives a breathing wave, your *why*, your if-then plan and replacement actions.
  - A trigger log (HALT-style) shows your top triggers and riskiest time of day.
  - A discreet phone reminder arrives before your high-risk hour.

## 10. Things we deliberately avoided

- **No purchasable loot boxes.** Crates and drops are only earned, never bought, especially since some players use AWAKEN to quit gambling.
- **No punishment in recovery mode.** HP penalties apply only to the Daily Quest, which you opt into.
- **No guilt-tripping companion.** It's happy when you show up and never sad in a way that shames you.
- **Privacy.** AI quests receive coarse context only. Mood, wellbeing scores, notes and recovery goals stay on your device unless you opt in. On Gemini's free tier, Google may use prompts to improve its products.
