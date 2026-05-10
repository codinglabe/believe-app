<?php

/**
 * Companion Hub catalog (client-provided categories + subcategories).
 * Stored as EventType rows: subcategory → name, group → category (prefixed for filtering).
 *
 * @return array<int, array{name: string, category: string, description: string}>
 */
return [
    ['name' => 'Bible Studies', 'category' => 'Companion · Faith & Spiritual', 'description' => 'Companion hub: faith and spiritual connection — Bible studies'],
    ['name' => 'Daily Devotionals', 'category' => 'Companion · Faith & Spiritual', 'description' => 'Companion hub: faith and spiritual connection — daily devotionals'],
    ['name' => 'Prayer Groups', 'category' => 'Companion · Faith & Spiritual', 'description' => 'Companion hub: faith and spiritual connection — prayer groups'],
    ['name' => 'Worship & Praise', 'category' => 'Companion · Faith & Spiritual', 'description' => 'Companion hub: faith and spiritual connection — worship and praise'],
    ['name' => 'Faith Discussions', 'category' => 'Companion · Faith & Spiritual', 'description' => 'Companion hub: faith and spiritual connection — faith discussions'],
    ['name' => 'Testimony Sharing', 'category' => 'Companion · Faith & Spiritual', 'description' => 'Companion hub: faith and spiritual connection — testimony sharing'],

    ['name' => 'Meet & Greet', 'category' => 'Companion · Social & Connection', 'description' => 'Companion hub: social connection — meet and greet'],
    ['name' => 'General Chat', 'category' => 'Companion · Social & Connection', 'description' => 'Companion hub: social connection — general chat'],
    ['name' => 'New Member Welcome', 'category' => 'Companion · Social & Connection', 'description' => 'Companion hub: social connection — new member welcome'],
    ['name' => 'Icebreakers', 'category' => 'Companion · Social & Connection', 'description' => 'Companion hub: social connection — icebreakers'],
    ['name' => 'Daily Check-In', 'category' => 'Companion · Social & Connection', 'description' => 'Companion hub: social connection — daily check-in'],
    ['name' => 'Friendship Circles', 'category' => 'Companion · Social & Connection', 'description' => 'Companion hub: social connection — friendship circles'],

    ['name' => 'Stress & Anxiety Support', 'category' => 'Companion · Mental Wellness', 'description' => 'Companion hub: mental wellness — stress and anxiety support'],
    ['name' => 'Depression Support', 'category' => 'Companion · Mental Wellness', 'description' => 'Companion hub: mental wellness — depression support'],
    ['name' => 'Grief & Loss', 'category' => 'Companion · Mental Wellness', 'description' => 'Companion hub: mental wellness — grief and loss'],
    ['name' => 'Caregiver Support', 'category' => 'Companion · Mental Wellness', 'description' => 'Companion hub: mental wellness — caregiver support'],
    ['name' => 'Encouragement Rooms', 'category' => 'Companion · Mental Wellness', 'description' => 'Companion hub: mental wellness — encouragement rooms'],
    ['name' => 'Life Challenges', 'category' => 'Companion · Mental Wellness', 'description' => 'Companion hub: mental wellness — life challenges'],

    ['name' => 'Senior Conversations', 'category' => 'Companion · Senior Adults', 'description' => 'Companion hub: senior adults — conversations and connection'],
    ['name' => 'Daily Companionship', 'category' => 'Companion · Senior Adults', 'description' => 'Companion hub: senior adults — daily companionship'],
    ['name' => 'Memory Sharing', 'category' => 'Companion · Senior Adults', 'description' => 'Companion hub: senior adults — memory sharing'],
    ['name' => 'Retirement Life', 'category' => 'Companion · Senior Adults', 'description' => 'Companion hub: senior adults — retirement life'],
    ['name' => 'Health Talk (Non-medical)', 'category' => 'Companion · Senior Adults', 'description' => 'Companion hub: senior adults — wellness talk (non-medical)'],
    ['name' => 'Faith for Seniors', 'category' => 'Companion · Senior Adults', 'description' => 'Companion hub: senior adults — faith and encouragement'],

    ['name' => 'Sports Talk', 'category' => 'Companion · Interests & Lifestyle', 'description' => 'Companion hub: interests and lifestyle — sports talk'],
    ['name' => 'Fitness & Health', 'category' => 'Companion · Interests & Lifestyle', 'description' => 'Companion hub: interests and lifestyle — fitness and health'],
    ['name' => 'Food & Cooking', 'category' => 'Companion · Interests & Lifestyle', 'description' => 'Companion hub: interests and lifestyle — food and cooking'],
    ['name' => 'Travel Stories', 'category' => 'Companion · Interests & Lifestyle', 'description' => 'Companion hub: interests and lifestyle — travel stories'],
    ['name' => 'Music & Entertainment', 'category' => 'Companion · Interests & Lifestyle', 'description' => 'Companion hub: interests and lifestyle — music and entertainment'],
    ['name' => 'Hobby Groups', 'category' => 'Companion · Interests & Lifestyle', 'description' => 'Companion hub: interests and lifestyle — hobby groups'],

    ['name' => 'Daily News Talk', 'category' => 'Companion · News & Discussion', 'description' => 'Companion hub: news and discussion — daily news talk'],
    ['name' => 'Current Events', 'category' => 'Companion · News & Discussion', 'description' => 'Companion hub: news and discussion — current events'],
    ['name' => 'Community Issues', 'category' => 'Companion · News & Discussion', 'description' => 'Companion hub: news and discussion — community issues'],
    ['name' => 'Faith & Society', 'category' => 'Companion · News & Discussion', 'description' => 'Companion hub: news and discussion — faith and society'],
    ['name' => 'Moderated Debate', 'category' => 'Companion · News & Discussion', 'description' => 'Companion hub: news and discussion — moderated debate'],

    ['name' => 'Book Discussions', 'category' => 'Companion · Learning & Growth', 'description' => 'Companion hub: learning and growth — book discussions'],
    ['name' => 'Personal Development', 'category' => 'Companion · Learning & Growth', 'description' => 'Companion hub: learning and growth — personal development'],
    ['name' => 'Financial Talk', 'category' => 'Companion · Learning & Growth', 'description' => 'Companion hub: learning and growth — financial talk'],
    ['name' => 'Career Conversations', 'category' => 'Companion · Learning & Growth', 'description' => 'Companion hub: learning and growth — career conversations'],
    ['name' => 'Life Skills', 'category' => 'Companion · Learning & Growth', 'description' => 'Companion hub: learning and growth — life skills'],

    ['name' => 'Family & Parenting', 'category' => 'Companion · Community & Culture', 'description' => 'Companion hub: community and culture — family and parenting'],
    ['name' => 'Relationship Talk', 'category' => 'Companion · Community & Culture', 'description' => 'Companion hub: community and culture — relationship talk'],
    ['name' => 'Cultural Conversations', 'category' => 'Companion · Community & Culture', 'description' => 'Companion hub: community and culture — cultural conversations'],
    ['name' => 'Local Community Groups', 'category' => 'Companion · Community & Culture', 'description' => 'Companion hub: community and culture — local community groups'],
    ['name' => 'Youth Hangouts', 'category' => 'Companion · Community & Culture', 'description' => 'Companion hub: community and culture — youth hangouts'],

    ['name' => 'Open Mic', 'category' => 'Companion · Audio Rooms', 'description' => 'Companion hub: audio rooms — open mic'],
    ['name' => 'Lonely? Come Talk', 'category' => 'Companion · Audio Rooms', 'description' => 'Companion hub: audio rooms — open conversation space'],
    ['name' => 'Late Night Chat', 'category' => 'Companion · Audio Rooms', 'description' => 'Companion hub: audio rooms — late night chat'],
    ['name' => 'Morning Motivation', 'category' => 'Companion · Audio Rooms', 'description' => 'Companion hub: audio rooms — morning motivation'],
    ['name' => 'Midday Check-In', 'category' => 'Companion · Audio Rooms', 'description' => 'Companion hub: audio rooms — midday check-in'],

    ['name' => 'AI Listener', 'category' => 'Companion · AI Companion', 'description' => 'Companion hub: AI companion — AI listener'],
    ['name' => 'Guided Reflection', 'category' => 'Companion · AI Companion', 'description' => 'Companion hub: AI companion — guided reflection'],
    ['name' => 'Prayer Assistant', 'category' => 'Companion · AI Companion', 'description' => 'Companion hub: AI companion — prayer assistant'],
    ['name' => 'Mood Support Chat', 'category' => 'Companion · AI Companion', 'description' => 'Companion hub: AI companion — mood support chat'],
];
