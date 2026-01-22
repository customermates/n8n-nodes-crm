import type {
	IWebhookFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type WebhookEvent =
	| 'contact.created'
	| 'contact.updated'
	| 'contact.deleted'
	| 'organization.created'
	| 'organization.updated'
	| 'organization.deleted'
	| 'deal.created'
	| 'deal.updated'
	| 'deal.deleted'
	| 'service.created'
	| 'service.updated'
	| 'service.deleted'
	| 'task.created'
	| 'task.updated'
	| 'task.deleted';

export class WebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'On New Customermates Event - Trigger',
		name: 'webhookTrigger',
		icon: 'file:../../static/customermates.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Customermates events occur',
		defaults: {
			name: 'On New Customermates Event',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The webhook events to listen to',
				options: [
					{
						name: 'Contact Created',
						value: 'contact.created',
					},
					{
						name: 'Contact Deleted',
						value: 'contact.deleted',
					},
					{
						name: 'Contact Updated',
						value: 'contact.updated',
					},
					{
						name: 'Deal Created',
						value: 'deal.created',
					},
					{
						name: 'Deal Deleted',
						value: 'deal.deleted',
					},
					{
						name: 'Deal Updated',
						value: 'deal.updated',
					},
					{
						name: 'Organization Created',
						value: 'organization.created',
					},
					{
						name: 'Organization Deleted',
						value: 'organization.deleted',
					},
					{
						name: 'Organization Updated',
						value: 'organization.updated',
					},
					{
						name: 'Service Created',
						value: 'service.created',
					},
					{
						name: 'Service Deleted',
						value: 'service.deleted',
					},
					{
						name: 'Service Updated',
						value: 'service.updated',
					},
					{
						name: 'Task Created',
						value: 'task.created',
					},
					{
						name: 'Task Deleted',
						value: 'task.deleted',
					},
					{
						name: 'Task Updated',
						value: 'task.updated',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const events = this.getNodeParameter('events', []) as WebhookEvent[];

		const body = req.body as {
			event: WebhookEvent;
			data: unknown;
			timestamp: string;
		};

		if (!events.includes(body.event)) {
			return {
				workflowData: [[]],
			};
		}

		const returnData: INodeExecutionData[] = [
			{
				json: {
					event: body.event,
					data: body.data as IDataObject,
					timestamp: body.timestamp,
				},
			},
		];

		return {
			workflowData: [returnData],
		};
	}
}
