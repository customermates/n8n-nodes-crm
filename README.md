# @customermates/n8n-nodes-crm

This is an n8n community node package for [Customermates](https://customermates.com), a modern CRM for small businesses. It enables you to integrate Customermates into your n8n workflows: create, find, update, delete and restore the records of any list (contacts, organizations, deals, services, tasks and the lists you configure yourself), react to record events, and automate messaging across connected accounts (email, LinkedIn, WhatsApp, and more).

Customermates is a clean, modern CRM designed for small teams. It's ready to use in 2 minutes, requires no training, is fully GDPR-compliant, and offers powerful automation capabilities through n8n. Made in Germany with data stored in German data centers.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

> **Version 2 is a breaking release.** It targets the configurable Customermates API, where contacts, organizations, deals, services, tasks and every list you create are records of one generic record API. Workflows built with version 1 must be migrated; see [Migrating from version 1](#migrating-from-version-1).

### Record

Works with the records of any list: the starter lists (Contacts, Organizations, Deals, Services, Tasks) and every list you configure yourself. Pick the **List** from a dropdown, then pick **fields by name**; both dropdowns are loaded from your workspace configuration (`POST /api/v1/model/read`).

- **Create** - Create a record with field values, assigned users, messaging channels and links to other records
- **Get** - Get a record by ID, optionally with its linked records
- **Get Many** - Search, filter (every field, including calculated ones, plus Created At, Updated At and Assigned To), sort and page through the records of a list
- **Update** - Set, append to or clear field values; change assigned users, channels and links. **Append** adds text after the current value of a Text or Formatted text field (Markdown for Formatted text) and never conflicts with a concurrent edit
- **Delete** - Move a record (with its sub-list rows and cascaded records) to Trash, where it stays restorable for 30 days; returns the `trashBatchId`. **Delete Permanently** deletes it at once and erases its values from history
- **Restore** - Restore a record from Trash, by record ID or by the `trashBatchId` of its delete

With **Simplify** on (the default), records are returned as `{ id, listId, list, version, createdAt, updatedAt, assignedUserIds, fields: { "<Field name>": <value> } }`: choice fields return option labels, currency fields `{ value, currency }`, date ranges `{ start, end }` and Formatted text plain text. Turn it off for the raw API response with typed values keyed by field ID.

Values are entered as text: choice fields take the option label (or ID), multiple values are comma-separated, date ranges use `start,end`, currency accepts `120.50 EUR`, and Formatted text takes plain text (blank lines separate paragraphs). A JSON object with a `kind` property (for example `{"kind":"decimal","value":"10","currency":null}`) is sent unchanged.

### List

- **Get Many** - List the lists (record types) of the workspace
- **Get** - Get a list with its fields (type, choice options, calculated or not) and relationships

### Trash

- **Get Many** - List Trash items (records, lists, fields, relationships, views, widgets, routines, Knowledge Base pages), filtered by kind, list or text
- **Restore** - Restore Trash items by ID, or everything one delete moved to Trash by its batch ID
- **Delete Permanently** - Permanently delete Trash items; the node previews the impact and confirms it with the returned impact hash

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

- **Record events** for every list: `record.created`, `record.updated`, `record.deleted` (the record **moved to Trash**; it can still be restored), `record.restored` (carries the values after restore) and `record.deletedPermanently` (carries only the record reference, because its values are erased). Optionally limit record events to one **List**, and record updates to changes of selected **fields**.
- Messaging events: message received/updated/deleted, message reaction, email received/deleted, chat updated/deleted
- Calendar events: calendar changed, calendar event changed
- Social events: relation created

A record deleted with **Delete Permanently** first emits `record.deleted` and then `record.deletedPermanently`.

Each item carries `event`, `eventId`, `deliveryId`, `actorId`, `timestamp` and `data`. Retries keep the same `eventId`; deduplicate on it. For record events, `data` holds `causeId`, `cause.kind` (`mutation`, `configuration` or `system`) and `record`:

- `record.ref` - `typeId` (the list) and `recordId`
- `record.schemaRevision`, `record.beforeVersion` and `record.afterVersion` (`null` before a create and after a delete)
- `record.fields[]` - one entry per field the event changed (every set field for `record.created` and `record.restored`), each `{ fieldId, before, after }` where `before`/`after` carry the field's `label`, `valueType`, choice `options` and its typed `value` (`{ state: "value", value: { kind, … } }`)
- `record.assignments` (`{ before, after }` user IDs), `record.identities` (channels), `record.links` and `record.related` (linked records with titles)

Values are redacted by the current access of the user who owns the webhook. `record.deletedPermanently` carries only `ref` and `schemaRevision`: its `fields` are empty because the values are erased.

The trigger registers and removes its webhook automatically (a webhook that Customermates paused or disabled is replaced on the next activation) when you activate or deactivate the workflow. On activation it generates a signing secret and subscribes to your selected events; every delivery is verified against the `X-Webhook-Signature` header (HMAC-SHA-256 of the raw body) and mismatches are rejected. No manual webhook setup is required.

## Migrating from version 1

Version 1 used one resource per entity and fixed fields; the API it called is gone. Re-open every workflow that uses the Customermates node or trigger and change it as follows. Credentials are unchanged and keep working.

| Version 1                                                   | Version 2                                                                                                                                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resource **Contact / Organization / Deal / Service / Task** | Resource **Record**, and pick the list (Contacts, Organizations, Deals, Services, Tasks)                                                                                    |
| Create with First Name, Last Name, Name, Amount             | Create with **Fields**: add each field by name, for example First name, Last name, Name                                                                                     |
| Custom Field Values (custom column + value)                 | Ordinary **Fields**: custom columns are fields of the list                                                                                                                  |
| Notes                                                       | The list's **Formatted text** field; use Update with Mode **Append** to add to it                                                                                           |
| Emails / Messaging Channels                                 | Email fields as ordinary Fields; channels under **Additional Fields > Channels**                                                                                            |
| Contact/Organization/Deal/Service/Task/User IDs on a record | **Additional Fields > Links** (Create) or **Link Changes** (Update), and **Assigned User Names or IDs**                                                                     |
| Deal Services with quantity                                 | Create Line item records in the Deal's Line items sub-list and link them to the deal and service                                                                            |
| Get Many with Search Term and Sort By                       | Get Many with **Options > Search**, **Sort Field** and **Filters**                                                                                                          |
| Delete (permanent)                                          | Delete moves to **Trash**; enable **Delete Permanently** for the old behavior. **Restore** brings it back                                                                   |
| Output fields `firstName`, `name`, `customFieldValues`, …   | With Simplify: `fields["First name"]`, `fields["Name"]`, … ; without: typed values by field ID                                                                              |
| Trigger events `contact.created`, `deal.updated`, …         | `record.created`, `record.updated`, … with **List** set to Contacts, Deals, …; `*.deleted` now means moved to Trash, plus `record.restored` and `record.deletedPermanently` |
| Trigger payload `data.<entity>` fields                      | `data.record.ref` and `data.record.fields[]` with `label`, `before` and `after`                                                                                             |

A workflow that still uses a version 1 resource, or a trigger that still lists a version 1 event, fails with an error that points to this guide.

**Rollback:** to go back, reinstall `@customermates/n8n-nodes-crm@1.4.0` and restore the version 1 workflows from your n8n history or export. Version 1 only works against a Customermates instance without the configurable record API.

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
- **Tested with**: n8n 2.42.6
- **Customermates**: version 2 of this package requires the configurable record API (`/api/v1/records`, `/api/v1/model`, `/api/v1/trash`). Use version 1.x against an instance without it.

## Usage

1. Add the Customermates node to your workflow
2. Configure the Customermates credentials with your API key
3. Select the resource (Record, List, Trash, Messaging, or Social Relation) and operation; for records, pick the list
4. Fill in the required fields for your selected operation
5. Execute the workflow

### Webhook Triggers

1. Add the Customermates Trigger node to your workflow
2. Select which events you want to listen to, and optionally the list
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
- **Configurable Records**: Contacts, Organizations, Deals, Services, Tasks and your own lists, fields, calculations and relationships
- **Unified Inbox**: Email, LinkedIn, WhatsApp, Instagram, and Telegram connected to your CRM
- **n8n Integration**: Fully automatable with custom workflows and AI agents
- **GDPR Compliant**: All data stored securely in German data centers
- **Affordable Pricing**: €7 per user with no hidden costs
- **Clean Interface**: Minimalist, intuitive design that's easy to use
