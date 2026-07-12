import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { apiRequest } from './helpers/api';

export class CustomermatesTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Customermates Trigger',
		name: 'customermatesTrigger',
		icon: 'file:customermates.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Customermates events occur',
		defaults: {
			name: 'Customermates Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'customermatesApi',
				required: true,
			},
		],
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
						name: 'Calendar Changed',
						value: 'messaging.calendar.changed',
						description: 'A calendar of a connected account changed',
					},
					{
						name: 'Calendar Event Changed',
						value: 'messaging.calendar_event.changed',
						description: 'A calendar event was created, updated, or deleted',
					},
					{
						name: 'Chat Deleted',
						value: 'messaging.chat.deleted',
					},
					{
						name: 'Chat Updated',
						value: 'messaging.chat.updated',
					},
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
						name: 'Email Deleted',
						value: 'messaging.email.deleted',
					},
					{
						name: 'Email Received',
						value: 'messaging.email.received',
					},
					{
						name: 'Message Deleted',
						value: 'messaging.message.deleted',
					},
					{
						name: 'Message Reaction',
						value: 'messaging.message.reaction',
						description: 'A reaction was added to or removed from a chat message',
					},
					{
						name: 'Message Received',
						value: 'messaging.message.received',
						description: 'A chat message was received on a connected account',
					},
					{
						name: 'Message Updated',
						value: 'messaging.message.updated',
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
						name: 'Relation Created',
						value: 'messaging.relation.created',
						description: 'A new connection was added on a connected social account',
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

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId) {
					return false;
				}
				try {
					const existing = await apiRequest(this, 'GET', `/webhooks/${webhookData.webhookId}`);
					return existing != null;
				} catch {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events', []) as string[];
				const secret = randomBytes(32).toString('hex');

				const created = await apiRequest(this, 'POST', '/webhooks', {
					url: webhookUrl,
					events,
					description: 'n8n trigger',
					secret,
				});

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = created.id as string;
				webhookData.secret = secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId) {
					try {
						await apiRequest(this, 'DELETE', `/webhooks/${webhookData.webhookId}`);
					} catch {
						return false;
					}
					delete webhookData.webhookId;
					delete webhookData.secret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const events = this.getNodeParameter('events', []) as string[];
		const secret = this.getWorkflowStaticData('node').secret as string | undefined;

		if (secret) {
			const signature = req.headers['x-webhook-signature'];
			const rawBody =
				(req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
			const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
			const valid =
				typeof signature === 'string' &&
				signature.length === expected.length &&
				timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
			if (!valid) {
				this.getResponseObject().status(401).json({ message: 'Invalid webhook signature' });
				return { noWebhookResponse: true };
			}
		}

		const body = req.body as { event: string; data: IDataObject; timestamp: string };
		if (!events.includes(body.event)) {
			return { workflowData: [[]] };
		}

		return {
			workflowData: [
				[
					{
						json: {
							event: body.event,
							data: body.data,
							timestamp: body.timestamp,
						},
					},
				],
			],
		};
	}
}
