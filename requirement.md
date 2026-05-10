
Get responses tailored to you

Log in to get answers based on saved chats, plus create images and upload files.


Log in
Developer Note — Unity Loaves Directory Page
Build this page as the main Unity Loaves Network Directory, where supporters can find feeding locations, donate money, and drop off non-perishable food.

Page Purpose
This page should show all organizations that are feeding people or accepting food donations. The user should be able to search by location, see meal/drop-off locations on a map, view church/nonprofit service information, and donate directly to a specific organization.

Main Features
1. Directory Search
Add filters for:

Filter	Options
Location	Near me, city, zip code
Meal Type	Food Pantry, Hot Meals, Community Meal, All Types
Day	Any Day, Monday-Sunday
Food Donations	Accepts Food Donations, Does Not Accept, All Locations
Service Type	Worship, Youth Program, Bible Study, Clothing Closet, Prayer Meeting, Community Meal
2. Map + List View
The page should have:

Section	Description
Map View	Shows pins for each location
List View	Shows organization cards
Toggle	User can switch Map/List
Pin Colors	Green = meal location, Orange = drop-off location, Both = green/orange marker
3. Organization Card
Each organization card should show:

Field	Example
Organization Name	First Baptist Church Pantry
Address	123 Hope St, Orlando, FL
Distance	1.2 miles away
Meal Type	Food Pantry
Meal Days	Wednesday, Saturday
Meal Time	10:00 AM – 1:00 PM
Drop-off Badge	Accepts Food Donations
Drop-off Time	Today 9AM – 2PM
Loaves Served	1,250
Favorite Button	Heart icon
Buttons:

View Details

Donate to This Location

Drop Off Food Here

Get Directions

4. Right-Side Detail Panel
When a user clicks an organization, show a detail panel with:

Section	Content
Header Image	Church/nonprofit image
Name + Address	Organization name and address
Quick Actions	Directions, Call, Website, Save
Meal Information	Type, days, serving time
Drop-off Information	Accepts food, drop-off hours, instructions
Current Needs	Canned goods, rice, pasta, peanut butter, cereal
Service Information	Church/nonprofit activities
About	Short organization description
Impact	Loaves served, families helped, total yearly loaves
CTA Buttons	Donate to This Location, Drop Off Food Here
Service Information Section
Add this section so churches and nonprofits can list activities beyond food service.

Example activities:

Service	Schedule
Sunday Worship Service	Sundays at 10:30 AM
Youth Program	Fridays at 6:30 PM
Community Meal	Every Tuesday at 5:30 PM
Clothing Closet	2nd & 4th Saturday at 9:00 AM
Bible Study	Wednesdays at 7:00 PM
Prayer Meeting	Thursdays at 6:30 PM
This helps the directory become more than food assistance. It also becomes a community engagement directory.

Database Tables
unity_loaves_locations
id
organization_id
name
description
address
city
state
zip
latitude
longitude
phone
website
image_url
meal_type
accepts_food_donations
dropoff_instructions
is_active
created_at
updated_at
unity_loaves_schedules
id
location_id
schedule_type -- meal, dropoff, service
title
description
day_of_week
start_time
end_time
recurrence_text
created_at
updated_at
unity_loaves_needs
id
location_id
item_name
category
priority_level
quantity_needed
is_active
updated_at
unity_loaves_impact_stats
id
location_id
loaves_served
families_helped
total_loaves_year
last_updated
Donation Logic
Each location should have a Donate to This Location button.

Donation routing options:

Option	Logic
This Location	Donation goes to selected organization
My Area	Donation is split among nearby organizations
Highest Need	Donation goes to organizations with highest need score
Use Stripe Connect if the organization has onboarding completed.

Food Drop-off Logic
The Drop Off Food Here button should show:

Accepted items

Current needs

Drop-off hours

Drop-off instructions

Directions button

Optional later feature: supporter can confirm “I dropped off food” and upload a photo or receipt.

Design Notes
Keep the page simple and visual:

Green = meals/help

Orange = food drop-off

Show badges clearly

Make “Donate” and “Drop Off Food” buttons always visible

Mobile version should stack: search → map/list → location details

Final page goal:

Find food. Give help. Feed hope.





Voice
We use cookies

Cookies help this site function, measure usage, and support marketing. Manage your cookie preferences anytime. Learn more about our cookie policy.


Reject non-essential

Accept all

Feeding the Poor Movement
You’re viewing user-generated content that may be unverified or unsafe.
Report
Developer Note — Unity Loaves Directory Page
Build this page as the main Unity Loaves Network Directory, where supporters can find feeding locations, donate money, and drop off non-perishable food.

Page Purpose
This page should show all organizations that are feeding people or accepting food donations. The user should be able to search by location, see meal/drop-off locations on a map, view church/nonprofit service information, and donate directly to a specific organization.

Main Features
1. Directory Search
Add filters for:

Filter	Options
Location	Near me, city, zip code
Meal Type	Food Pantry, Hot Meals, Community Meal, All Types
Day	Any Day, Monday-Sunday
Food Donations	Accepts Food Donations, Does Not Accept, All Locations
Service Type	Worship, Youth Program, Bible Study, Clothing Closet, Prayer Meeting, Community Meal
2. Map + List View
The page should have:

Section	Description
Map View	Shows pins for each location
List View	Shows organization cards
Toggle	User can switch Map/List
Pin Colors	Green = meal location, Orange = drop-off location, Both = green/orange marker
3. Organization Card
Each organization card should show:

Field	Example
Organization Name	First Baptist Church Pantry
Address	123 Hope St, Orlando, FL
Distance	1.2 miles away
Meal Type	Food Pantry
Meal Days	Wednesday, Saturday
Meal Time	10:00 AM – 1:00 PM
Drop-off Badge	Accepts Food Donations
Drop-off Time	Today 9AM – 2PM
Loaves Served	1,250
Favorite Button	Heart icon
Buttons:

View Details

Donate to This Location

Drop Off Food Here

Get Directions

4. Right-Side Detail Panel
When a user clicks an organization, show a detail panel with:

Section	Content
Header Image	Church/nonprofit image
Name + Address	Organization name and address
Quick Actions	Directions, Call, Website, Save
Meal Information	Type, days, serving time
Drop-off Information	Accepts food, drop-off hours, instructions
Current Needs	Canned goods, rice, pasta, peanut butter, cereal
Service Information	Church/nonprofit activities
About	Short organization description
Impact	Loaves served, families helped, total yearly loaves
CTA Buttons	Donate to This Location, Drop Off Food Here
Service Information Section
Add this section so churches and nonprofits can list activities beyond food service.

Example activities:

Service	Schedule
Sunday Worship Service	Sundays at 10:30 AM
Youth Program	Fridays at 6:30 PM
Community Meal	Every Tuesday at 5:30 PM
Clothing Closet	2nd & 4th Saturday at 9:00 AM
Bible Study	Wednesdays at 7:00 PM
Prayer Meeting	Thursdays at 6:30 PM
This helps the directory become more than food assistance. It also becomes a community engagement directory.

Database Tables
unity_loaves_locations
id
organization_id
name
description
address
city
state
zip
latitude
longitude
phone
website
image_url
meal_type
accepts_food_donations
dropoff_instructions
is_active
created_at
updated_at
unity_loaves_schedules
id
location_id
schedule_type -- meal, dropoff, service
title
description
day_of_week
start_time
end_time
recurrence_text
created_at
updated_at
unity_loaves_needs
id
location_id
item_name
category
priority_level
quantity_needed
is_active
updated_at
unity_loaves_impact_stats
id
location_id
loaves_served
families_helped
total_loaves_year
last_updated
Donation Logic
Each location should have a Donate to This Location button.

Donation routing options:

Option	Logic
This Location	Donation goes to selected organization
My Area	Donation is split among nearby organizations
Highest Need	Donation goes to organizations with highest need score
Use Stripe Connect if the organization has onboarding completed.

Food Drop-off Logic
The Drop Off Food Here button should show:

Accepted items

Current needs

Drop-off hours

Drop-off instructions

Directions button

Optional later feature: supporter can confirm “I dropped off food” and upload a photo or receipt.

Design Notes
Keep the page simple and visual:

Green = meals/help

Orange = food drop-off

Show badges clearly

Make “Donate” and “Drop Off Food” buttons always visible

Mobile version should stack: search → map/list → location details

Final page goal:

Find food. Give help. Feed hope.

