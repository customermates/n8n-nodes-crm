# @customermates/n8n-nodes-crm

This is an n8n community node package for [Customermates](https://customermates.com), a modern CRM for small businesses. It enables you to integrate Customermates into your n8n workflows, allowing you to automate contact management, organization tracking, deal management, service operations, and task management.

Customermates is a clean, modern CRM designed for small teams. It's ready to use in 2 minutes, requires no training, is fully GDPR-compliant, and offers powerful automation capabilities through n8n. Made in Germany with data stored in German data centers.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The Customermates node supports the following operations:

- **Create** - Create a new record
- **Get** - Retrieve a single record by ID
- **Get Many** - Search and retrieve multiple records with filtering, sorting, and pagination
- **Update** - Update existing record information
- **Delete** - Delete a record by ID

### Available Resources

- **Contacts** - Manage contacts with organizations, users, deals, and custom fields
- **Organizations** - Manage organizations with contacts, users, deals, and custom fields
- **Deals** - Manage deals with organizations, users, contacts, services, and custom fields
- **Services** - Manage services with users, deals, and custom fields
- **Tasks** - Manage tasks with users and custom fields

### Webhook Trigger

The Customermates Trigger node listens for events in Customermates:

- Contact events: created, updated, deleted
- Organization events: created, updated, deleted
- Deal events: created, updated, deleted
- Service events: created, updated, deleted
- Task events: created, updated, deleted

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
3. Select the resource (Contact, Organization, Deal, Service, or Task) and operation (Create, Get, Get Many, Update, or Delete)
4. Fill in the required fields for your selected operation
5. Execute the workflow

### Webhook Triggers

1. Add the Customermates Trigger node to your workflow
2. Select which events you want to listen to
3. Configure the webhook URL in your Customermates account settings
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
- **n8n Integration**: Fully automatable with custom workflows and AI agents
- **GDPR Compliant**: All data stored securely in German data centers
- **Affordable Pricing**: €10 per user with no hidden costs
- **Clean Interface**: Minimalist, intuitive design that's easy to use
