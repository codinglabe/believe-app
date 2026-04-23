Perfect—here is the clean, final developer spec rewritten using:

🔷 Feedback & Rewards (FINAL SPEC)
Domain: merchant.501c3ers.com
Module: Merchant Hub → Feedback & Rewards

🎯 1. Core Purpose
Allow merchants to:

Create feedback campaigns

Ask simple questions (Y/N, T/F, Multiple Choice)

Reward supporters with BRP for completed responses

Control budget and cost

Get insights from responses

💰 2. Core Currency Rule
BRP only

1 BRP = $0.01 (platform value)

Used for:

Feedback rewards

Merchant Hub purchases

🧱 3. Module Structure
Merchant Hub → Feedback & Rewards
Create Feedback Campaign

Campaigns (List)

Responses

Rewards Wallet (BRP)

Insights

🖥️ 4. Main Screens
A. Create Feedback Campaign (Your UI Image)
Sections:
1. Reward Setup
Fields:

Campaign Title

Campaign Type:

Quick Vote (3 BRP)

Short Feedback (10 BRP)

Standard Survey (25 BRP)

Deep Feedback (50 BRP)

Reward Per Response (editable)

Estimated Time (auto)

2. Question Type
ONLY support:

Yes / No

True / False

Multiple Choice

Logic:
If Yes / No:
Show question input only

If True / False:
Show question input only

If Multiple Choice:
Show:

Option A

Option B

Add more button (min 2, max 6)

3. Budget & Responses
Fields:

Total Budget (BRP)

Dollar value display

Max Responses (auto calculated)

4. Live Calculation
Max Responses = Budget ÷ Reward
Example:

10,000 ÷ 10 = 1,000 responses
5. Summary
Display:

BRP per response

Max participants

Total campaign cost

Estimated reach

“Budget will be reserved when campaign starts”

6. Launch Button
Disabled if:

No BRP balance

No question

Invalid options

Budget < reward

💳 5. BRP Purchase (REQUIRED)
Merchant must buy BRP before launching
Screen: Buy BRP
Fields:

Current Balance

Select Package:

5,000 BRP ($50)

10,000 BRP ($100)

25,000 BRP ($250)

Custom amount (optional)

Payment (Stripe)

After purchase:
Update wallet

Log transaction

Redirect back

🗄️ 6. Database Tables
A. merchant_brp_wallets
merchant_id

balance_brp

reserved_brp

spent_brp

B. merchant_brp_transactions
Tracks:

purchase

reserve

payout

release

C. feedback_campaigns
merchant_id

title

type

reward_per_response_brp

total_budget_brp

reserved_budget_brp

spent_budget_brp

remaining_budget_brp

max_responses

responses_count

status

D. feedback_campaign_questions
campaign_id

question_text

question_type

E. feedback_campaign_question_options
(for multiple choice only)

F. feedback_campaign_responses
supporter_id

campaign_id

reward_brp

status

G. feedback_campaign_response_answers
H. supporter_brp_wallets
I. supporter_brp_transactions
🔁 7. Campaign Flow
Step 1: Merchant creates campaign
Sets reward + budget

Adds question

Step 2: System calculates responses
max_responses = budget ÷ reward
Step 3: Launch campaign
System:

checks wallet

reserves BRP

sets campaign to active

Step 4: Supporter completes feedback
System:

validates response

records answers

issues BRP

Step 5: BRP payout
Merchant:
reserved → spent

Supporter:
BRP added

Step 6: Campaign ends
When:

max responses reached

budget exhausted

manually ended

System:

releases unused BRP

🔒 8. Wallet Logic
Available BRP
available = balance - reserved
Reserve on launch
reserved += campaign_budget
Payout per response
reserved -= reward
spent += reward
🧠 9. Validation Rules
One response per supporter

Must answer all required questions

Campaign must be active

Budget must remain

Authenticated user required

⚠️ 10. Anti-Abuse (Phase 1)
Limit 1 response per user

Basic validation

Server-side reward logic

📊 11. Insights (Results)
Yes/No
Yes %

No %

True/False
True %

False %

Multiple Choice
Option breakdown %

🔔 12. Notifications
Merchant:
campaign started

budget low

campaign completed

Supporter:
new feedback available

reward earned

🧭 13. Routes
Merchant
/feedback-rewards

/feedback-rewards/create

/feedback-rewards/{id}

/wallet/brp

/wallet/brp/buy

Supporter
/feedback/{uuid}

🧠 14. Key Developer Services
BRP Wallet Service

Campaign Service

Reward Payout Service

Validation Service

🔥 15. Key System Rule
👉 Do NOT deduct BRP upfront

Always:

reserve first

spend only when response is completed

🚀 16. Final Developer Instruction
Build a “Feedback & Rewards” module where merchants create feedback campaigns, set BRP rewards per response, define a total budget, and the system auto-calculates maximum participants. Merchants must purchase BRP before launching. BRP is reserved at launch and only deducted when valid responses are completed. Support Yes/No, True/False, and Multiple Choice questions only.

If you want next, I can:

Design the Supporter Feedback Screen (what users see)

Show the BRP checkout flow in Merchant Hub

Or map this into your full transaction export system

This is now clean, scalable, and build-ready 👍