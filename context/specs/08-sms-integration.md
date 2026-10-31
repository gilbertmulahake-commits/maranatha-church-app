# Unit 08: SMS Integration (Africa's Talking - Mocked)

## Goal
Build an automated SMS notification system. For the MVP, we will mock the Africa's Talking API by saving the generated SMS messages to a database table (`SmsLog`). We will trigger SMS receipts when a payment is successfully processed via the KCB webhook, and add a "Send Reminder" button to the Regional Dashboard for overdue churches.

## Design
- **Database:** Add a new `SmsLog` model to track every message sent (or mocked).
- **Webhook Integration:** When the KCB webhook successfully saves a payment, it triggers an SMS receipt to the treasurer.
- **UI Integration:** In the Regional Dashboard, next to a `Pending` church, add a "Send Reminder" button. Clicking it triggers a mocked SMS and shows a success toast.

## Implementation

### 1. Prisma Schema Update
Add this model to `prisma/schema.prisma`:
```prisma
model SmsLog {
  id        String   @id @default(uuid())
  phone     String
  message   String
  status    String   @default("Sent") // 'Sent', 'Failed'
  type      String   // 'Receipt', 'Reminder'
  created_at DateTime @default(now())
}
```
Run `npx prisma7 migrate dev --name add_sms_log` and `npx prisma7 generate`.

### 2. SMS Server Action
- Create `lib/actions/sms-actions.ts`.
- Write a function `sendSms(phone: string, message: string, type: string)`.
- *Logic:* Instead of calling the real Africa's Talking API, it will simply `console.log` the message and create a record in the `SmsLog` table.

### 3. Trigger SMS on Webhook (Receipts)
- Open `app/api/webhooks/kcb/route.ts`.
- After the payment is successfully saved, call `sendSms(MSISDN, "Payment of KES ${TransAmount} received. Thank you. - Maranatha", "Receipt")`.

### 4. Trigger SMS on Dashboard (Reminders)
- Open `app/dashboard/regional/page.tsx`.
- Change the `Pending` status badge in the table to include a small "Send Reminder" button (using the `Button` component).
- When clicked, it calls a new Server Action `sendReminder(churchId, phone)`.
- This action looks up the church name and calls `sendSms()` with a reminder message.

## Verification Checklist
- [ ] Submitting a mock KCB payment automatically creates a `Receipt` entry in the `SmsLog` table in Supabase.
- [ ] The Regional Dashboard shows a "Send Reminder" button for Pending churches.
- [ ] Clicking the button creates a `Reminder` entry in the `SmsLog` table.
- [ ] No TypeScript or lint errors.