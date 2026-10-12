import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { apiRequest } from './helpers/api';
import { discoverModel } from './helpers/model';
import { loadOptions } from './operations/options';

const REMOVED_EVENT = /^(contact|deal|organization|service|task)\.(created|updated|deleted)$/;

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
						name: 'Record Created',
						value: 'record.created',
						description: 'A record was created in a list',
					},
					{
						name: 'Record Deleted (Moved to Trash)',
						value: 'record.deleted',
						description: 'A record was moved to Trash; it can still be restored for 30 days',
					},
					{
						name: 'Record Deleted Permanently',
						value: 'record.deletedPermanently',
						description:
							'A record was deleted permanently; the payload carries only its reference because its values are erased',
					},
					{
						name: 'Record Restored',
						value: 'record.restored',
						description:
							'A record was restored from Trash; the payload carries its values after restore',
					},
					{
						name: 'Record Updated',
						value: 'record.updated',
						description: 'Field values, assignment, channels or links of a record changed',
					},
					{
						name: 'Relation Created',
						value: 'messaging.relation.created',
						description: 'A new connection was added on a connected social account',
					},
				],
			},
			{
				displayName: 'List Name or ID',
				name: 'typeId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'loadListOptions' },
				default: '',
				displayOptions: {
					show: {
						events: [
							'record.created',
							'record.updated',
							'record.deleted',
							'record.restored',
							'record.deletedPermanently',
						],
					},
				},
				description:
					'Only trigger for records of this list; leave empty for every list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Changed Field Names or IDs',
				name: 'changedFieldIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'loadFieldOptions', loadOptionsDependsOn: ['typeId'] },
				default: [],
				displayOptions: { show: { events: ['record.updated'] } },
				description:
					'Only trigger record updates that change one of these fields (requires a list); leave empty for any change. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	};

	methods = { loadOptions };

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId) {
					return false;
				}
				try {
					const existing = await apiRequest(this, 'GET', `/webhooks/${webhookData.webhookId}`);
					if (existing == null) {
						return false;
					}
					if (existing.enabled === false || existing.pausedReason) {
						// A paused or disabled subscription delivers nothing: replace it on activation.
						await apiRequest(this, 'DELETE', `/webhooks/${webhookData.webhookId}`).catch(
							() => null,
						);
						delete webhookData.webhookId;
						delete webhookData.secret;
						return false;
					}
					return true;
				} catch {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events', []) as string[];
				const removed = events.filter((event) => REMOVED_EVENT.test(event));
				if (removed.length > 0) {
					throw new NodeOperationError(
						this.getNode(),
						`The trigger events ${removed.join(', ')} were removed in version 2 of this node`,
						{
							description:
								'Use Record Created, Record Updated, Record Deleted (Moved to Trash), Record Restored or Record Deleted Permanently and pick the list. See "Migrating from version 1" in the package README.',
						},
					);
				}
				const secret = randomBytes(32).toString('hex');
				const body: IDataObject = {
					url: webhookUrl,
					events,
					description: 'n8n trigger',
					secret,
				};
				if (events.some((event) => event.startsWith('record.'))) {
					const typeId = this.getNodeParameter('typeId', '') as string;
					const changedFieldIds = events.includes('record.updated')
						? (this.getNodeParameter('changedFieldIds', []) as string[])
						: [];
					body.expectedSchemaRevision = (await discoverModel(this)).revision;
					if (typeId) {
						body.recordTrigger = { query: { typeId }, changedFieldIds };
					}
				}

				const created = await apiRequest(this, 'POST', '/webhooks', body);

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

		const body = req.body as {
			event: string;
			id?: string;
			actorId?: string | null;
			data: IDataObject;
			timestamp: string;
		};
		if (!events.includes(body.event)) {
			return { workflowData: [[]] };
		}

		return {
			workflowData: [
				[
					{
						json: {
							event: body.event,
							eventId: body.id ?? null,
							actorId: body.actorId ?? null,
							deliveryId: (req.headers['x-customermates-delivery-id'] as string) ?? null,
							data: body.data,
							timestamp: body.timestamp,
						},
					},
				],
			],
		};
	}
}
