# Maranatha Faith Assemblies Kenya - Collection System

## Overview
A real-time financial and administrative management system for Maranatha Faith Assemblies Kenya, built on a strict organizational hierarchy of **National HQ \(\rightarrow\) 60 Regions \(\rightarrow\) 1,600 Local Churches**. The system tracks annual (KES 5,000) and monthly (KES 500) contributions flowing into a **single centralized KCB Bank Account** via a dedicated M-Pesa Paybill. Its primary purpose is to eliminate historical revenue leakage by receiving real-time payment webhooks from KCB and intelligently funneling these transactions into 1,600 distinct "streams" using the Church ID (`BillRefNumber`). By automating this reconciliation and enforcing compliance through SMS, the system provides National HQ with complete real-time visibility to ensure the full KES 17.6M annual target is collected with minimal human intervention.

## Goals
1. **Maximize Revenue Collection:** Solve the historical problem of under-collection by automating follow-ups and providing real-time compliance tracking.
2. **Zero-Touch Reconciliation:** Automate payment matching by linking KCB Paybill/M-Pesa transaction references (Church IDs) to church accounts.
3. **Enhanced Communication:** Use Africa's Talking SMS to automatically remind churches of pending dues without manual staff intervention.
4. **Real-Time Accessibility:** Provide a cloud-based dashboard accessible from anywhere (HQ, Region, or Church) to monitor financial health instantly.
5. **Automate Accountability:** Calculate Regional Incentive Scores (40/30/20/10 formula) to drive healthy competition and compliance among chairmen.

## Core User Flow
1. **Church Treasurer:** Initiates payment on their phone via the dedicated KCB M-Pesa Paybill. They enter their unique Church ID (e.g., `CH001`) in the Account Number field.
2. **KCB/M-Pesa:** Processes the payment into the single KCB bank account and fires a secure webhook (IPN) to our system.
3. **The System:** Receives the webhook, verifies the security signature, extracts the Church ID, and auto-reconciles the payment. It then triggers an SMS receipt to the treasurer.
4. **Regional Chairman:** Logs in to see a live dashboard of their region. The system automatically flags unpaid churches and triggers SMS reminders.
5. **National HQ Finance:** Views the main dashboard to see total real-time collections (Target: KES 17.6M), regional compliance percentages, unmatched payments, and audit trails.

## Features
### Integrations & Automation (Core)
- **Centralized KCB Reconciliation (Mocked API for MVP):** The system uses webhooks to listen for real-time payment data from KCB (representing both M-Pesa Paybill and Bank transfers). It automatically uses the BillRefNumber to split the incoming funds, credit the correct Local Church stream, and update Regional/National HQ totals instantly. Any unmatched payments are routed to a manual review queue to ensure no revenue is lost.
- **SMS Gateway (Africa's Talking):** Automated SMS receipts for successful payments, and automated reminders for pending/overdue accounts.
- **Auto-Reconciliation Engine:** Logic to match KCB transaction `BillRefNumber` to Church IDs. Unmatched payments go to a manual review queue.

### Church & Payment Management
- Church Registration (Unique ID, Name, Region, Treasurer).
- Payment Tracking (Monthly/Annual, Amount, Date, Method, Status).
- Regional & HQ Dashboards with real-time data.

## Scope
### In Scope
- Role-based access (Church, Region, HQ).
- Mocked KCB API integration (simulating M-Pesa Paybill and Bank webhooks).
- Africa's Talking SMS integration.
- Automated calculation of compliance and regional incentive tiers.
- Real-time dashboard UI mimicking the PDF wireframes.

### Out of Scope
- Multi-currency support (KES only).
- Excel data imports (will be built in a later phase).
- Complex accounting/general ledger features (we are tracking contributions, not full balance sheets).

## Success Criteria
- A simulated KCB webhook containing a Church ID updates the HQ dashboard instantly.
- The system accurately flags payments with invalid Church IDs for manual review.
- The SMS system successfully sends a mock reminder to a church treasurer when their payment is overdue.
- The system accurately calculates the "Final Score" and "Incentive Tier" for a region based on the 40/30/20/10 weighted formula.