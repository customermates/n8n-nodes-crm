# @customermates/n8n-nodes-crm

This is an n8n community node package for [Customermates](https://customermates.com), a modern CRM for small businesses. It enables you to integrate Customermates into your n8n workflows, allowing you to automate contact management, organization tracking, deal management, service operations, task management, and messaging across connected accounts (email, LinkedIn, WhatsApp, and more).

Customermates is a clean, modern CRM designed for small teams. It's ready to use in 2 minutes, requires no training, is fully GDPR-compliant, and offers powerful automation capabilities through n8n. Made in Germany with data stored in German data centers.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### CRM Resources

Contacts, Organizations, Deals, Services, and Tasks each support:

- **Create** - Create a new record
- **Get** - Retrieve a single record by ID
- **Get Many** - Search and retrieve multiple records with filtering, sorting, and pagination
- **Update** - Update existing record information
- **Delete** - Delete a record by ID

Contacts additionally support **messaging channels** on Create and Update: link email addresses, LinkedIn profiles, WhatsApp numbers, Instagram or Telegram handles to a contact. On Update, the provided channel list replaces the complete channel set; omit it to leave channels unchanged.

### Messaging

- **Get Connected Accounts** - List the messaging accounts connected in Customermates
- **Get Thread** - Get a conversation thread with its messages
- **Get Many Threads** - Search conversation threads
- **Send Chat Message** - Send a chat message in an existing thread
- **Send Email** - Send an email from a connected account
- **Start Chat** - Start a new chat conversation (WhatsApp, LinkedIn incl. InMail/Sales Navigator/Recruiter, Instagram, Telegram)

### Social Relation

- **Get Many** - List received or sent connection requests of a connected LinkedIn or Instagram account
- **Send Invitation** - Send a connection request, optionally with a message
- **Accept Invitation** - Accept a received connection request
- **Cancel Invitation** - Withdraw a sent or refuse a received connection request

### Webhook Trigger

The Customermates Trigger node listens for events in Customermates:

- Contact events: created, updated, deleted
- Organization events: created, updated, deleted
- Deal events: created, updated, deleted
- Service events: created, updated, deleted
- Task events: created, updated, deleted
- Messaging events: message received/updated/deleted, message reaction, email received/deleted, chat updated/deleted
- Calendar events: calendar changed, calendar event changed
- Social events: relation created

The trigger registers and removes its webhook automatically when you activate or deactivate the workflow. On activation it generates a signing secret and subscribes to your selected events; every delivery is verified against the `X-Webhook-Signature` header (HMAC-SHA-256 of the raw body) and mismatches are rejected. No manual webhook setup is required.

## Credentials

To use this node, you need a Customermates API key.

### Prerequisites

1. Sign up for a Customermates account at [https://customermates.com](https://customermates.com)
2. Navigate to your account settings to generate an API key

### Setup

1. In n8n, add the Customermates credentials
2. Enter your API key in the credentials form
3. The credentials will be automatically authenticated with Customermates

For more information about Customermates API keys, visit the [Customermates documentation](https://customermates.com).

## Compatibility

- **Minimum n8n version**: 2.0.0
- **Tested with**: Latest n8n versions

## Usage

1. Add the Customermates node to your workflow
2. Configure the Customermates credentials with your API key
3. Select the resource (Contact, Organization, Deal, Service, Task, Messaging, or Social Relation) and operation
4. Fill in the required fields for your selected operation
5. Execute the workflow

### Webhook Triggers

1. Add the Customermates Trigger node to your workflow
2. Select which events you want to listen to
3. Activate the workflow — the node registers its webhook in Customermates automatically (and removes it when you deactivate)
4. The workflow will trigger automatically when selected events occur

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Customermates Website](https://customermates.com)
- [Customermates API Documentation](https://customermates.com/openapi.json)
- [n8n Documentation](https://docs.n8n.io/)

## About Customermates

Customermates is a modern CRM designed specifically for small businesses. Key features include:

- **Quick Setup**: Ready to use in 2 minutes, no training required
- **Essential Features**: Contacts, Organizations, Deals, Services, and Tasks management
- **Unified Inbox**: Email, LinkedIn, WhatsApp, Instagram, and Telegram connected to your CRM
- **n8n Integration**: Fully automatable with custom workflows and AI agents
- **GDPR Compliant**: All data stored securely in German data centers
- **Affordable Pricing**: €7 per user with no hidden costs
- **Clean Interface**: Minimalist, intuitive design that's easy to use
