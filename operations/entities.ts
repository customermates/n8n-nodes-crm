import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, searchAll, splitList, withMeta } from '../helpers/api';

type EntityField = {
	displayName: string;
	name: string;
	type: 'string' | 'number';
	description: string;
};

type Entity = {
	resource: string;
	label: string;
	article: 'a' | 'an';
	path: string;
	idParam: string;
	fields: EntityField[];
	links: string[];
	extraOptions: INodeProperties[];
	customColumnLoader: string;
};

const LINKS: Record<string, { displayName: string; noun: string; loader: string }> = {
	contactIds: {
		displayName: 'Contact Names or IDs',
		noun: 'contacts',
		loader: 'loadContactOptions',
	},
	dealIds: { displayName: 'Deal Names or IDs', noun: 'deals', loader: 'loadDealOptions' },
	organizationIds: {
		displayName: 'Organization Names or IDs',
		noun: 'organizations',
		loader: 'loadOrganizationOptions',
	},
	serviceIds: {
		displayName: 'Service Names or IDs',
		noun: 'services',
		loader: 'loadServiceOptions',
	},
	taskIds: { displayName: 'Task Names or IDs', noun: 'tasks', loader: 'loadTaskOptions' },
	userIds: { displayName: 'User Names or IDs', noun: 'users', loader: 'loadUserOptions' },
};

const emailsOption: INodeProperties = {
	displayName: 'Emails',
	name: 'emails',
	type: 'string',
	default: '',
	placeholder: 'jane@example.com, jane.smith@example.com',
	description: 'Comma-separated list of email addresses for this contact',
};

const identifiersOption: INodeProperties = {
	displayName: 'Messaging Channels',
	name: 'identifiers',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: 'Add Channel',
	description:
		'Messaging channels of this contact (email, LinkedIn, WhatsApp, …). On update this replaces the complete channel set; omit it to leave channels unchanged.',
	options: [
		{
			displayName: 'Channel',
			name: 'identifier',
			values: [
				{
					displayName: 'Provider',
					name: 'provider',
					type: 'options',
					options: [
						{ name: 'Email', value: 'mail' },
						{ name: 'Google', value: 'google' },
						{ name: 'Instagram', value: 'instagram' },
						{ name: 'LinkedIn', value: 'linkedin' },
						{ name: 'Outlook', value: 'outlook' },
						{ name: 'Telegram', value: 'telegram' },
						{ name: 'WhatsApp', value: 'whatsapp' },
					],
					default: 'mail',
					description: 'The messaging provider of this channel',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					required: true,
					description:
						'The channel address: email address, phone number (WhatsApp), or handle (LinkedIn, Instagram, Telegram)',
				},
				{
					displayName: 'Messaging ID',
					name: 'messagingId',
					type: 'string',
					default: '',
					description:
						'Provider-internal ID needed to start chats on LinkedIn, Telegram and Instagram. Without it the channel is view-only.',
				},
				{
					displayName: 'Display Name',
					name: 'displayName',
					type: 'string',
					default: '',
					description: 'Display name of this channel profile',
				},
				{
					displayName: 'Profile URL',
					name: 'profileUrl',
					type: 'string',
					default: '',
					description: 'Public profile URL of this channel',
				},
			],
		},
	],
};

const servicesOption: INodeProperties = {
	displayName: 'Services',
	name: 'services',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: 'Add Service',
	description: 'Services to include in this deal',
	options: [
		{
			displayName: 'Service',
			name: 'service',
			values: [
				{
					displayName: 'Service Name or ID',
					name: 'serviceId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'loadServiceOptions',
					},
					default: '',
					required: true,
					description:
						'The service to add. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Quantity',
					name: 'quantity',
					type: 'number',
					default: 1,
					description: 'The quantity of this service',
				},
			],
		},
	],
};

const ENTITIES: Entity[] = [
	{
		resource: 'contact',
		label: 'Contact',
		article: 'a',
		path: 'contacts',
		idParam: 'contactId',
		fields: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				description: 'The first name of the contact',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				description: 'The last name of the contact',
			},
		],
		links: ['organizationIds', 'userIds', 'dealIds', 'taskIds'],
		extraOptions: [emailsOption, identifiersOption],
		customColumnLoader: 'loadContactCustomColumnOptions',
	},
	{
		resource: 'organization',
		label: 'Organization',
		article: 'an',
		path: 'organizations',
		idParam: 'organizationId',
		fields: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				description: 'The name of the organization',
			},
		],
		links: ['contactIds', 'userIds', 'dealIds', 'taskIds'],
		extraOptions: [],
		customColumnLoader: 'loadOrganizationCustomColumnOptions',
	},
	{
		resource: 'deal',
		label: 'Deal',
		article: 'a',
		path: 'deals',
		idParam: 'dealId',
		fields: [
			{ displayName: 'Name', name: 'name', type: 'string', description: 'The name of the deal' },
		],
		links: ['organizationIds', 'userIds', 'contactIds', 'taskIds'],
		extraOptions: [servicesOption],
		customColumnLoader: 'loadDealCustomColumnOptions',
	},
	{
		resource: 'service',
		label: 'Service',
		article: 'a',
		path: 'services',
		idParam: 'serviceId',
		fields: [
			{ displayName: 'Name', name: 'name', type: 'string', description: 'The name of the service' },
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				description: 'The amount/price of the service',
			},
		],
		links: ['userIds', 'dealIds', 'taskIds'],
		extraOptions: [],
		customColumnLoader: 'loadServiceCustomColumnOptions',
	},
	{
		resource: 'task',
		label: 'Task',
		article: 'a',
		path: 'tasks',
		idParam: 'taskId',
		fields: [
			{ displayName: 'Name', name: 'name', type: 'string', description: 'The name of the task' },
		],
		links: ['userIds', 'contactIds', 'organizationIds', 'dealIds', 'serviceIds'],
		extraOptions: [],
		customColumnLoader: 'loadTaskCustomColumnOptions',
	},
];

function linkOption(field: string, resource: string): INodeProperties {
	const link = LINKS[field];
	return {
		displayName: link.displayName,
		name: field,
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: link.loader,
		},
		default: [],
		description: `The ${link.noun} to associate with this ${resource}. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.`,
	};
}

function customFieldValuesOption(entity: Entity): INodeProperties {
	return {
		displayName: 'Custom Field Values',
		name: 'customFieldValues',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Field',
		description: `Custom field values for the ${entity.resource}`,
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Custom Column Name or ID',
						name: 'columnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: entity.customColumnLoader,
						},
						default: '',
						required: true,
						description:
							'The custom column to set a value for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value for this custom field (always a string)',
					},
				],
			},
		],
	};
}

function byDisplayName(a: INodeProperties, b: INodeProperties): number {
	return a.displayName.localeCompare(b.displayName);
}

function entityProps(entity: Entity): INodeProperties[] {
	const { resource, article, path, idParam, fields } = entity;
	const show = (operation: string) => ({ show: { resource: [resource], operation: [operation] } });
	const idProp = (operation: string, verb: string): INodeProperties => ({
		displayName: 'ID',
		name: idParam,
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(operation),
		description: `The unique identifier (UUID) of the ${resource} to ${verb}`,
	});
	const collectionOptions = [
		...entity.links.map((link) => linkOption(link, resource)),
		...entity.extraOptions,
		customFieldValuesOption(entity),
	].sort(byDisplayName);
	const updateOptions = [
		...fields.map(
			(field): INodeProperties => ({
				displayName: field.displayName,
				name: field.name,
				type: field.type,
				default: field.type === 'number' ? 0 : '',
				description: field.description,
			}),
		),
		...collectionOptions,
	].sort(byDisplayName);

	return [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [resource] } },
			options: [
				{
					name: 'Create',
					value: 'create',
					description: `Create ${article} ${resource}`,
					action: `Create ${article} ${resource}`,
				},
				{
					name: 'Delete',
					value: 'delete',
					description: `Delete ${article} ${resource}`,
					action: `Delete ${article} ${resource}`,
				},
				{
					name: 'Get',
					value: 'get',
					description: `Get data of ${article} ${resource}`,
					action: `Get ${article} ${resource}`,
				},
				{
					name: 'Get Many',
					value: 'getAll',
					description: `Get data of many ${path}`,
					action: `Get many ${path}`,
				},
				{
					name: 'Update',
					value: 'update',
					description: `Update ${article} ${resource}`,
					action: `Update ${article} ${resource}`,
				},
			],
			default: 'create',
		},
		...fields.map(
			(field): INodeProperties => ({
				displayName: field.displayName,
				name: field.name,
				type: field.type,
				default: field.type === 'number' ? 0 : '',
				required: true,
				displayOptions: show('create'),
				description: field.description,
			}),
		),
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: show('create'),
			options: collectionOptions,
		},
		idProp('delete', 'delete'),
		idProp('get', 'retrieve'),
		idProp('update', 'update'),
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: show('update'),
			description: `Fields to update on the ${resource}`,
			options: updateOptions,
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: show('getAll'),
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: {
				minValue: 1,
				maxValue: 1000,
			},
			default: 25,
			displayOptions: { show: { resource: [resource], operation: ['getAll'], returnAll: [false] } },
			description: 'Max number of results to return',
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: show('getAll'),
			options: [
				{
					displayName: 'Search Term',
					name: 'searchTerm',
					type: 'string',
					default: '',
					description: `Search term to filter ${path}`,
				},
				{
					displayName: 'Sort By',
					name: 'sortBy',
					type: 'options',
					options: [
						{ name: 'Created At', value: 'createdAt' },
						{ name: 'Name', value: 'name' },
						{ name: 'Updated At', value: 'updatedAt' },
					],
					default: 'name',
				},
				{
					displayName: 'Sort Direction',
					name: 'sortDirection',
					type: 'options',
					options: [
						{ name: 'Ascending', value: 'asc' },
						{ name: 'Descending', value: 'desc' },
					],
					default: 'asc',
				},
			],
		},
	];
}

function compactStrings(record: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== ''));
}

function buildBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};
	for (const [key, value] of Object.entries(fields)) {
		if (key === 'emails') {
			body.emails = splitList(value as string);
		} else if (key === 'identifiers') {
			body.identifiers = (((value as IDataObject).identifier as IDataObject[]) ?? []).map(
				compactStrings,
			);
		} else if (key === 'services') {
			body.services = ((value as IDataObject).service as IDataObject[]) ?? [];
		} else if (key === 'customFieldValues') {
			const seenColumnIds = new Set<string>();
			body.customFieldValues = (((value as IDataObject).field as IDataObject[]) ?? []).filter(
				(field) => {
					if (seenColumnIds.has(field.columnId as string)) {
						return false;
					}
					seenColumnIds.add(field.columnId as string);
					return true;
				},
			);
		} else {
			body[key] = value;
		}
	}
	return body;
}

type Handler = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<INodeExecutionData | INodeExecutionData[]>;

function entityHandlerMap(entity: Entity): Record<string, Handler> {
	const { resource, label, path, idParam, fields } = entity;

	return {
		create: async function (this: IExecuteFunctions, itemIndex: number) {
			const body: IDataObject = {};
			for (const field of fields) {
				body[field.name] = this.getNodeParameter(field.name, itemIndex);
			}
			Object.assign(
				body,
				buildBody(this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject),
			);
			const response = await apiRequest(this, 'POST', `/${path}`, body);
			return { json: response, pairedItem: { item: itemIndex } };
		},
		delete: async function (this: IExecuteFunctions, itemIndex: number) {
			const id = this.getNodeParameter(idParam, itemIndex) as string;
			const deletedId = await apiRequest<string>(this, 'DELETE', `/${path}/${id}`);
			return { json: { id: deletedId }, pairedItem: { item: itemIndex } };
		},
		get: async function (this: IExecuteFunctions, itemIndex: number) {
			const id = this.getNodeParameter(idParam, itemIndex) as string;
			const response = await apiRequest(this, 'GET', `/${path}/${id}`);
			const record = response[resource] as IDataObject | null;
			if (!record) {
				throw new NodeOperationError(this.getNode(), `${label} with ID "${id}" not found`, {
					itemIndex,
				});
			}
			return { json: withMeta(record, response), pairedItem: { item: itemIndex } };
		},
		getAll: async function (this: IExecuteFunctions, itemIndex: number) {
			return await searchAll(this, `/${path}/search`, itemIndex);
		},
		update: async function (this: IExecuteFunctions, itemIndex: number) {
			const id = this.getNodeParameter(idParam, itemIndex) as string;
			const body = buildBody(this.getNodeParameter('updateFields', itemIndex, {}) as IDataObject);
			if (Object.keys(body).length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					`At least one field must be provided in Update Fields to update the ${resource}`,
					{ itemIndex },
				);
			}
			const response = await apiRequest(this, 'PUT', `/${path}/${id}`, body);
			return { json: response, pairedItem: { item: itemIndex } };
		},
	};
}

export const entityProperties: INodeProperties[] = ENTITIES.flatMap(entityProps);

export const entityHandlers: Record<string, Record<string, Handler>> = Object.fromEntries(
	ENTITIES.map((entity) => [entity.resource, entityHandlerMap(entity)]),
);

export type { Handler };
