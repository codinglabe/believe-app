# Queue Worker Setup for Newsletter Sending

## Problem
Newsletters are scheduled but not sending because the queue worker is not running.

## Solution

You need to run **TWO** commands simultaneously:

### 1. Schedule Worker (for processing scheduled newsletters)
```bash
php artisan schedule:work
```
This checks every minute for newsletters that are ready to send and dispatches them to the queue.

### 2. Queue Worker (for actually sending emails)
```bash
php artisan queue:work
```
This processes the jobs in the queue and actually sends the emails.

## How It Works

1. **Schedule Worker** (`schedule:work`):
   - Runs every minute
   - Finds newsletters with `status = 'scheduled'` and `send_date <= now()`
   - Dispatches `SendNewsletterJob` to the queue
   - Updates newsletter status to 'sending'

2. **Queue Worker** (`queue:work`):
   - Processes jobs from the `jobs` table
   - Executes `SendNewsletterJob` which sends the actual emails
   - Updates email statuses as emails are sent

## Running Both Commands

### Option 1: Two Separate Terminals
- Terminal 1: `php artisan schedule:work`
- Terminal 2: `php artisan queue:work`

### Option 2: Background Process (Production)
For production, use a process manager like Supervisor to run both commands as background services.

## Testing

1. Create a newsletter with `schedule_type = 'scheduled'` and set `send_date` to a few minutes in the future
2. Wait for the scheduled time
3. Check the schedule worker output - it should find and dispatch the newsletter
4. Check the queue worker output - it should process and send the emails
5. Check the `jobs` table to see if jobs are being queued
6. Check the `newsletter_emails` table to see if emails are being sent

## Troubleshooting

- **Newsletters not being found**: Check that `send_date` is set correctly and in UTC
- **Jobs not processing**: Make sure `queue:work` is running
- **Emails not sending**: Check mail configuration and logs
- **Queue connection**: Make sure `QUEUE_CONNECTION=database` in `.env`
