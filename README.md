# n8n-nodes-customermates

This is an n8n community node package for [Customermates](https://customermates.com), a modern CRM for small businesses. It enables you to integrate Customermates into your n8n workflows, allowing you to automate contact management, deal tracking, and service operations.

Customermates is a clean, modern CRM designed for small teams. It's ready to use in 2 minutes, requires no training, is fully GDPR-compliant, and offers powerful automation capabilities through n8n. Made in Germany with data stored in German data centers.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Contact Operations

- **Create Contact** - Create a new contact in Customermates with first name, last name, organizations, users, deals, and custom field values
- **Get Contact By ID** - Retrieve a single contact by its unique identifier (UUID)
- **Get Contacts** - Search and retrieve multiple contacts with filtering, sorting, and pagination options
- **Update Contact** - Update existing contact information including name, associations, and custom fields
- **Delete Contact By ID** - Delete a contact from Customermates by its unique identifier

### Webhook Trigger

- **On New Customermates Event** - Trigger workflows when events occur in Customermates:
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

### Creating a Contact

1. Add the "Create Contact" node to your workflow
2. Configure the Customermates credentials
3. Fill in the required fields (First Name, Last Name)
4. Optionally add organizations, users, deals, and custom field values
5. Execute the workflow to create the contact

### Searching Contacts

1. Add the "Get Contacts" node to your workflow
2. Configure search parameters:
   - Search term (optional)
   - Sort by (name, createdAt, updatedAt)
   - Sort direction (ascending or descending)
   - Maximum items to retrieve (5, 10, 25, 100, or 1000)
3. The node will return matching contacts with their associated data

### Updating Contacts

1. Add the "Update Contact" node to your workflow
2. Provide the Contact ID
3. In the "Update Fields" collection, add only the fields you want to update:
   - First Name
   - Last Name
   - Organizations
   - Users
   - Deals
   - Custom Field Values
4. Only the specified fields will be updated; other fields remain unchanged

### Webhook Triggers

1. Add the "On New Customermates Event" trigger node to your workflow
2. Select which events you want to listen to (contact.created, deal.updated, etc.)
3. Configure the webhook URL in your Customermates account settings
4. The workflow will trigger automatically when selected events occur

### Custom Fields

Custom fields can be added to contacts through the "Custom Field Values" option. The node automatically loads available custom columns from your Customermates configuration, allowing you to set values for any custom field defined in your CRM.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Customermates Website](https://customermates.com)
- [Customermates API Documentation](https://customermates.com/openapi.json)
- [n8n Documentation](https://docs.n8n.io/)

## About Customermates

Customermates is a modern CRM designed specifically for small businesses. Key features include:

- **Quick Setup**: Ready to use in 2 minutes, no training required
- **Essential Features**: Contacts, Organizations, Deals, and Services management
- **n8n Integration**: Fully automatable with custom workflows and AI agents
- **GDPR Compliant**: All data stored securely in German data centers
- **Affordable Pricing**: €10 per user with no hidden costs
- **Clean Interface**: Minimalist, intuitive design that's easy to use
