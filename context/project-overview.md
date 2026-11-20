# Maranatha Faith Assemblies Kenya - Collection System

## Overview
A real-time financial and administrative management system for Maranatha Faith Assemblies Kenya, built on a strict organizational hierarchy of **National HQ → 60 Regions → 1,600 Local Churches**. The system tracks annual (KES 5,000) and monthly (KES 500) contributions flowing into a **single centralized Bank Account** via a dedicated M-Pesa Paybill, and now covers the full financial lifecycle: real-time webhook intake, automated allocation, SMS receipts and reminders, formal handling of every financial exception (unmatched payments, offline receipts, bad debt), and a forensic audit trail of every mutation. Its primary purpose is to eliminate historical revenue leakage by receiving payment webhooks from the bank and intelligently funnelling these transactions into 1,600 distinct "streams" using the Church ID (`BillRefNumber`) — and, where the automated path cannot resolve a payment, to route it to a human with the evidence and controls needed to resolve it safely. National HQ retains complete, real-time visibility and ultimate financial authority, with separation of duties enforced at the server boundary so no single administrator can both create and approve a financial event.

## Goals
1. **Maximize Revenue Collection:** Solve the historical problem of under-collection by automating follow-ups and providing real-time compliance tracking.
2. **Zero-Touch Reconciliation:** Automate payment matching by linking Bank Paybill/M-Pesa transaction references (Church IDs) to church accounts. Every payment that cannot be matched is captured, never discarded, and surfaced with ranked suggestions.
3. **Financial Integrity & Accountability:** Every financial mutation is attributable, reversible only through explicit approval, and recorded in an append-only audit trail. Resolutions above KES 20,000 and all write-offs require a second approver.
4. **Enhanced Communication:** Use Africa's Talking SMS to automatically send receipts and remind churches of pending dues without manual staff intervention.
5. **Real-Time Accessibility:** Provide a cloud-based dashboard accessible from anywhere (HQ, Region, or Church) to monitor financial health instantly, with Annual and Monthly obligations tracked as independent ledgers.
6. **Automate Accountability:** Calculate Regional Incentive Scores (40/30/20/10 formula) to drive healthy competition and compliance among chairmen.

## Core User Flow
1. **Church Treasurer:** Initiates payment on their phone via the dedicated Bank M-Pesa Paybill. They enter their unique Church ID (e.g., `CH001`) in the Account Number field.
2. **Bank/M-Pesa:** Processes the payment into the central bank account and fires a secure webhook (IPN) to our system.
3. **The System (matched path):** Receives the webhook, verifies the security signature, extracts the Church ID, and auto-reconciles the payment using the **Allocation Engine** (splitting it between Annual/Monthly arrears and prepayments). It then triggers an SMS receipt.
4. **The System (unmatched path):** If the Church ID does not resolve to an active church, the payment is captured in the **Unmatched Payments** queue with the raw payload, amount, payer phone, and the top fuzzy suggestions. The bank receives HTTP 200 so it stops retrying. Finance staff resolve it manually — or, above KES 20,000, submit it for Treasurer approval.
5. **Offline payments:** Cash, cheque, and direct bank transfers are recorded through **Manual Entry**. The system previews the FIFO allocation, the operator may override it row by row, and above KES 20,000 the entry is staged as a **Pending Payment** rather than posted.
6. **Bad debt:** Where an obligation is genuinely uncollectable, a **Write-Off** is proposed with a reason code. The Treasurer must approve it. Gross arrears remain unchanged; the written-off amount is netted off in reporting, and a full write-off marks the church **defunct**.
7. **Regional Chairman:** Logs in to see a live dashboard of their region. The system automatically flags unpaid churches and triggers SMS reminders.
8. **National HQ Finance:** Views the command centre dashboard for real-time collections, bucket health, arrears aging, unmatched payments, pending approvals, and the audit trail.

## Features

### Bank Reconciliation & Payment Intake
- **Centralized Bank Reconciliation:** Webhooks capture real-time payment data, credit the correct Local Church stream, and update Regional/National totals instantly.
- **Unmatched Payment Capture:** Every payment that fails matching is persisted with its raw payload and ranked fuzzy suggestions. Never discarded, never retried at the bank.
- **Solutions Bank:** A self-improving pattern store. Every human resolution is remembered; the same messy reference is recognised on the next occurrence and suggested before any character-distance matching runs.
- **Bank Adapter Pattern:** KCB and Equity payloads are normalised into a single `NormalizedTransaction` shape before reaching the reconciliation engine, so a second bank can be added without rewriting intake.
- **Mock KCB Simulator:** A development UI for firing signed webhook payloads against the system.
- **STK Push Initiation (Unit 19c, Sandbox):** The in-app Pay Now wizard can trigger an M-Pesa STK Push against the client's **bank-issued** paybill (KCB or Equity), not a Safaricom-issued one. KCB Buni and Equity Jenga are the initiation providers. The `Payment` ledger is written only by the bank's confirmation channel — never by an initiation response or a client button. The manual channel (19b) stays permanent as the fallback when a provider is down or credentials are pending.

### Financial Ledger & Allocation
- **The Allocation Engine:** Splits lump-sum payments across past-year arrears, current-year dues, and future prepayments using a strict FIFO priority model. Payment records remain immutable 1:1 bank ledger entries; attribution lives in the allocation table.
- **Strict Bucket Isolation:** Annual (KES 5,000) and Monthly (KES 500) obligations are independent ledgers. An overpayment in one does not cover a shortfall in the other. Every KPI, table, and SMS reflects the active bucket.
- **Write-Off Accounting:** Obligation is never erased — Gross Arrears, Less Written Off, Net Recoverable are reported separately. Aging buckets reduce oldest-debt-first.
- **Defunct Church Handling:** Churches whose full outstanding is written off are excluded from compliance percentages, regional scores, SMS lists, and dropdowns — while remaining visible in financial reports.

### Reconciliation & Exception Handling
- **Four-Eyes Approval:** Resolutions and manual entries at or above KES 20,000, any item touching 90+ day arrears, and every write-off require Treasurer approval. A proposer can never approve their own item — enforced server-side, not merely hidden in the UI.
- **Hybrid Allocation Preview:** Every resolution and manual entry shows the computed allocation before submission, with per-row manual override.
- **Pending Payment Staging:** High-value entries create a staging record, never a payment. The immutable ledger only receives approved items.
- **SLA Escalation:** Unresolved items are flagged green / yellow / red by age, with an additional warning badge on 90+ day arrears.
- **Manual Entry:** Records cash, cheque, and direct bank transfers that bypass the webhook, with an optional attachment reference.

### Dashboards & Reporting
- **Executive Command Center (National):** Four-tier layout — Command Bar (schedule adherence against Expected-to-Date, plus an arrears action centre), Bucket Health (independent Annual and Monthly cards, compliance snapshot in counts rather than misleading percentages), Analytics (collection trend and arrears aging across 0–30 / 31–60 / 61–90 / 90+ days), Accountability (regional leaderboard with arrears column and drill-down, live activity feed).
- **Regional & Local Dashboards:** Scoped to the viewer's region or church, with the same bucket isolation. The Local view reports gross, written-off, and net outstanding.
- **Audit Log Viewer:** Searchable, filterable, sortable forensic record of every critical mutation, with on-demand before/after snapshots.

### Communication
- **SMS Gateway (Africa's Talking):** Automated receipts on successful payment, and automated reminders for pending or overdue accounts. Message identity reflects the sender's role.
- **Bulk Reminders:** National and Regional staff can dispatch reminders to a filtered set of churches.

### Access Control & User Management
- **Layered Roles:** National (System Admin, Finance Admin, Operations Admin, National Treasurer, National Overseer), Regional (Chairman, Treasurer), and Local (Pastor, Church Treasurer) — each with a defined sidebar and mutation boundary.
- **Separation of Duties:** Finance administration controls money; Operations administration controls registry and users. Neither can perform the other's function. The platform owner retains super-admin authority.
- **Protected Accounts:** Vendor-owned accounts cannot be modified, demoted, or deactivated by any client user, and are hidden from the user list unless the viewer is also a system administrator.
- **User Lifecycle:** Soft-deactivation, forced password reset, and auditable role changes.
- **Secure Auth Flows:** Password reset and email verification use token-hash verification rather than PKCE code exchange, eliminating session races.

### Data Export
- **Enterprise Export Engine:** Any table exports to CSV, Excel, or branded PDF, and can be printed. Bulk actions intercept to confirm scope (selected rows versus all rows).

## Scope
### In Scope
- Role-based access across National, Regional, and Local tiers, with server-enforced separation of duties.
- Bank webhook intake (currently mocked; adapter layer ready for real sandbox credentials).
- **KCB Buni API (Sandbox)** — STK Push initiation for KCB-issued paybills; production on Go-Live approval.
- **Equity Jenga API (Sandbox)** — STK Push initiation and IPN confirmation for Equity-issued paybills; production on Live Onboarding approval.
- Africa's Talking SMS integration (sandbox configured for UAT).
- Automated compliance calculation and regional incentive tiers.
- Reconciliation subsystem: unmatched queue, manual entry, write-offs, four-eyes approval, Solutions Bank.
- System-wide audit log with forensic snapshots.
- Real-time dashboards with Strict Bucket Isolation.
- Enterprise export across every table.

### Out of Scope
- Multi-currency support (KES only).
- Excel/spreadsheet data *imports* (exports are supported; imports are a later phase).
- A full general ledger: we track contribution obligations, receipts, allocations, and formal write-offs — not journal entries, double-entry books, or a balance sheet.
- Binary file uploads for manual-entry attachments (a reference URL field only, for now).
- Admin-authored Solutions Bank rules (patterns learn automatically from resolutions only).
- Scheduled digest emails and cron-driven escalation.
- KCB and Equity **production** go-live (sandbox is in-scope; production is blocked on the banks' Go-Live / Live Onboarding approvals).
- The optional Pastorate organisational layer (schema reserved, dormant).
- Configurable fund categories (Annual/Monthly are fixed; a dynamic Fund table is planned).
- Two-factor authentication.

## Success Criteria
- A bank webhook containing a valid Church ID updates the relevant dashboards instantly and dispatches an SMS receipt.
- A bank webhook containing an unrecognised Church ID returns HTTP 200, creates an unmatched record with ranked suggestions, and never discards the funds.
- A manual entry below KES 20,000 posts a payment immediately; at or above KES 20,000 it creates a pending record that only the Treasurer can approve.
- No user can approve an item they proposed — verified on both approval and rejection paths, for both payments and write-offs.
- A repeated messy reference is suggested with higher confidence on its second occurrence, and the learned pattern takes precedence over character-distance matching.
- A write-off leaves Gross Arrears unchanged, reduces Net Recoverable, and a full write-off excludes the church from compliance percentages, regional scores, and SMS lists.
- Every critical mutation appears in the audit log with actor, role, before and after snapshots.
- A Finance Admin cannot manage users or churches; an Operations Admin cannot access payments or reconciliation; neither can modify a protected account.
- National, Regional, and Local dashboards each report Annual and Monthly buckets independently.
- The system accurately calculates the "Final Score" and "Incentive Tier" for a region based on the 40/30/20/10 weighted formula.
- Any data table can be exported to CSV, Excel, or PDF, with correct behaviour for selected-versus-all rows.
- A treasurer can initiate an STK Push against the client's KCB or Equity paybill from the Pay Now wizard; the resulting `Payment` row is written exactly once, by the bank's confirmation channel, with the M-Pesa receipt code as `Payment.transaction_id`. Duplicate callbacks from either bank are a no-op.
