import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Handler } from '../helpers/api';
import { apiRequest } from '../helpers/api';
import type { Model, RecordRef } from '../helpers/model';
import {
	SYSTEM_FIELDS,
	discoverModel,
	idempotencyKey,
	parseRelationshipOption,
	requireField,
	requireType,
	settleOperation,
	simplifyRecord,
	toFilterValues,
	toTypedValue,
	typeFields,
	typeRelationships,
} from '../helpers/model';

const EXPRESSION_HINT =
	'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.';

const show = (operation: string[], extra: IDataObject = {}) => ({
	show: { resource: ['record'], operation, ...extra },
});

const fieldOption: INodeProperties = {
	displayName: 'Field Name or ID',
	name: 'fieldId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'loadFieldOptions', loadOptionsDependsOn: ['typeId'] },
	default: '',
	required: true,
	description: `The field of the selected list. ${EXPRESSION_HINT}`,
};

const valueOption: INodeProperties = {
	displayName: 'Value',
	name: 'value',
	type: 'string',
	default: '',
	description:
		'The value as text. Choice fields take the option label, multiple values are comma-separated, date ranges use "start,end", currency accepts "120.50 EUR", and Formatted text takes plain text (paragraphs separated by blank lines). A JSON object with a "kind" property is sent unchanged.',
};

const identitiesOption: INodeProperties = {
	displayName: 'Channels',
	name: 'identities',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	default: {},
	placeholder: 'Add Channel',
	description:
		'Messaging channels (email, LinkedIn, WhatsApp, …) for a list with a Channels field. On update this replaces the complete channel set; omit it to leave channels unchanged.',
	options: [
		{
			displayName: 'Channel',
			name: 'identity',
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

const assignedUsersOption: INodeProperties = {
	displayName: 'Assigned User Names or IDs',
	name: 'assignedUserIds',
	type: 'multiOptions',
	typeOptions: { loadOptionsMethod: 'loadUserOptions' },
	default: [],
	description: `Users assigned to the record. On update this replaces the assignment. ${EXPRESSION_HINT}`,
};

const relationshipOption: INodeProperties = {
	displayName: 'Relationship Name or ID',
	name: 'relationship',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'loadRelationshipOptions', loadOptionsDependsOn: ['typeId'] },
	default: '',
	required: true,
	description: `The relationship of the selected list to link through. ${EXPRESSION_HINT}`,
};

const linkedRecordOption: INodeProperties = {
	displayName: 'Linked Record ID',
	name: 'recordId',
	type: 'string',
	default: '',
	required: true,
	description: 'The ID of the record on the other side of the relationship',
};

const includeLinksOption: INodeProperties = {
	displayName: 'Include Linked Records',
	name: 'includeLinks',
	type: 'boolean',
	default: false,
	description: 'Whether to include up to 25 linked records per relationship',
};

export const recordProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['record'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a record in a list',
				action: 'Create a record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Move a record to Trash, or delete it permanently',
				action: 'Delete a record',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a record by ID',
				action: 'Get a record',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Search and filter the records of a list',
				action: 'Get many records',
			},
			{
				name: 'Restore',
				value: 'restore',
				description: 'Restore a record from Trash',
				action: 'Restore a record',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update the fields, assignment, channels or links of a record',
				action: 'Update a record',
			},
		],
		default: 'create',
	},
	{
		displayName: 'List Name or ID',
		name: 'typeId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'loadListOptions' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['record'] } },
		description: `The list (record type) to work with, for example Contacts or Deals. ${EXPRESSION_HINT}`,
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['delete', 'get', 'restore', 'update']),
		description: 'The unique identifier (UUID) of the record',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Field',
		displayOptions: show(['create']),
		description: 'Field values of the new record',
		options: [{ displayName: 'Field', name: 'field', values: [fieldOption, valueOption] }],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Field',
		displayOptions: show(['update']),
		description: 'Field changes; fields you do not add stay unchanged',
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					fieldOption,
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{
								name: 'Set',
								value: 'set',
								description: 'Replace the value',
							},
							{
								name: 'Append',
								value: 'append',
								description:
									'Add text after the current value with a blank line in between (Text and Formatted text fields; Markdown for Formatted text)',
							},
							{
								name: 'Clear',
								value: 'clear',
								description: 'Remove the value',
							},
						],
						default: 'set',
					},
					{ ...valueOption, displayOptions: { show: { mode: ['set', 'append'] } } },
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			assignedUsersOption,
			identitiesOption,
			{
				displayName: 'Links',
				name: 'links',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Link',
				description: 'Records to link the new record to',
				options: [
					{ displayName: 'Link', name: 'link', values: [relationshipOption, linkedRecordOption] },
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			assignedUsersOption,
			identitiesOption,
			{
				displayName: 'Link Changes',
				name: 'linkChanges',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Link Change',
				description: 'Records to link to or unlink from this record',
				options: [
					{
						displayName: 'Change',
						name: 'change',
						values: [
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								options: [
									{ name: 'Link', value: 'link' },
									{ name: 'Unlink', value: 'unlink' },
								],
								default: 'link',
							},
							relationshipOption,
							linkedRecordOption,
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['delete']),
		options: [
			{
				displayName: 'Delete Permanently',
				name: 'permanent',
				type: 'boolean',
				default: false,
				description:
					'Whether to delete the record permanently and erase its values from history instead of moving it to Trash. This cannot be undone.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['restore']),
		options: [
			{
				displayName: 'Trash Batch ID',
				name: 'trashBatchId',
				type: 'string',
				default: '',
				description:
					'The trashBatchId returned by Delete. Restores everything that delete moved to Trash (including sub-list rows and cascaded records) instead of looking the record up in Trash.',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: show(['getAll']),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: show(['getAll'], { returnAll: [false] }),
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Filter',
		displayOptions: show(['getAll']),
		description: 'Only return records matching every filter',
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				values: [
					{
						...fieldOption,
						typeOptions: {
							loadOptionsMethod: 'loadFilterFieldOptions',
							loadOptionsDependsOn: ['typeId'],
						},
						description: `The field to filter on. ${EXPRESSION_HINT}`,
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						options: [
							{ name: 'All Of', value: 'all' },
							{ name: 'Between', value: 'between' },
							{ name: 'Contains', value: 'contains' },
							{ name: 'Equals', value: 'eq' },
							{ name: 'Greater Than', value: 'gt' },
							{ name: 'Greater Than or Equal', value: 'gte' },
							{ name: 'In Last Days', value: 'inLastDays' },
							{ name: 'Is Empty', value: 'empty' },
							{ name: 'Is Not Empty', value: 'notEmpty' },
							{ name: 'Less Than', value: 'lt' },
							{ name: 'Less Than or Equal', value: 'lte' },
							{ name: 'Not Equals', value: 'ne' },
							{ name: 'Not In', value: 'notIn' },
							{ name: 'Not In Last Days', value: 'notInLastDays' },
							{ name: 'One Of', value: 'in' },
							{ name: 'Starts With', value: 'startsWith' },
						],
						default: 'eq',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: { hide: { operator: ['empty', 'notEmpty'] } },
						description:
							'The value to compare with. One Of, Not In and All Of take comma-separated values, Between takes "start,end", and In Last Days takes a number of days.',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			includeLinksOption,
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to search for in the searchable fields of the list',
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
			{
				displayName: 'Sort Field Name or ID',
				name: 'sortField',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'loadFilterFieldOptions',
					loadOptionsDependsOn: ['typeId'],
				},
				default: '',
				description: `The field to sort by. ${EXPRESSION_HINT}`,
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['get']),
		options: [includeLinksOption],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: show(['create', 'get', 'getAll', 'update']),
		description:
			'Whether to return field values keyed by field name instead of the raw API response with typed values keyed by field ID',
	},
];

type FieldEntry = { fieldId: string; value?: unknown; mode?: 'set' | 'append' | 'clear' };

function entriesOf(collection: IDataObject, key: string): IDataObject[] {
	return ((collection?.[key] as IDataObject[]) ?? []).filter(Boolean);
}

function emptyToNull(record: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(record).map(([key, value]) => [key, value === '' ? null : value]),
	);
}

function fieldAssignments(
	context: IExecuteFunctions,
	model: Model,
	typeId: string,
	entries: FieldEntry[],
	itemIndex: number,
): IDataObject[] {
	const seen = new Set<string>();
	const assignments: IDataObject[] = [];
	for (const entry of entries) {
		const field = requireField(context, model, typeId, entry.fieldId, itemIndex);
		if (seen.has(field.id)) {
			throw new NodeOperationError(
				context.getNode(),
				`Field "${field.label}" is set more than once`,
				{
					itemIndex,
				},
			);
		}
		seen.add(field.id);
		if (entry.mode === 'append') {
			assignments.push({ fieldId: field.id, append: String(entry.value ?? '') });
		} else if (entry.mode === 'clear') {
			assignments.push({ fieldId: field.id, value: null });
		} else {
			assignments.push({ fieldId: field.id, value: toTypedValue(field, entry.value) });
		}
	}
	return assignments;
}

function linkTarget(
	context: IExecuteFunctions,
	entry: IDataObject,
	itemIndex: number,
): { relationId: string; direction: string; record: RecordRef } {
	const side = parseRelationshipOption(context, entry.relationship as string, itemIndex);
	return {
		relationId: side.relationId,
		direction: side.direction,
		record: { typeId: side.otherTypeId, recordId: entry.recordId as string },
	};
}

function sharedChanges(
	context: IExecuteFunctions,
	additional: IDataObject,
	itemIndex: number,
): IDataObject {
	const changes: IDataObject = {};
	if (additional.assignedUserIds !== undefined) {
		changes.assignedUserIds = additional.assignedUserIds;
	}
	if (additional.identities !== undefined) {
		changes.identities = entriesOf(additional.identities as IDataObject, 'identity').map(
			emptyToNull,
		);
	}
	if (additional.links !== undefined) {
		changes.links = entriesOf(additional.links as IDataObject, 'link').map((entry) =>
			linkTarget(context, entry, itemIndex),
		);
	}
	if (additional.linkChanges !== undefined) {
		changes.linkChanges = entriesOf(additional.linkChanges as IDataObject, 'change').map(
			(entry) => ({ action: entry.action, ...linkTarget(context, entry, itemIndex) }),
		);
	}
	return changes;
}

async function mutate(
	context: IExecuteFunctions,
	model: Model,
	mutation: IDataObject,
	itemIndex: number,
): Promise<IDataObject> {
	const result = await apiRequest(context, 'POST', '/records/mutate', {
		expectedRevision: model.revision,
		idempotencyKey: idempotencyKey(context, itemIndex, mutation.action as string),
		mutation,
	});
	return await settleOperation(context, result, itemIndex);
}

function relationshipIncludes(model: Model, typeId: string): IDataObject[] {
	return typeRelationships(model, typeId)
		.slice(0, 32)
		.map((side) => ({ relationId: side.relationId, direction: side.direction, limit: 25 }));
}

async function readRecord(
	context: IExecuteFunctions,
	model: Model,
	ref: RecordRef,
	includeLinks = false,
): Promise<IDataObject> {
	const body: IDataObject = { ...ref };
	if (includeLinks) {
		body.includeRelationships = relationshipIncludes(model, ref.typeId);
	}
	return await apiRequest(context, 'POST', '/records/read', body);
}

function output(
	context: IExecuteFunctions,
	model: Model,
	record: IDataObject,
	itemIndex: number,
): INodeExecutionData {
	const simplify = context.getNodeParameter('simplify', itemIndex, true) as boolean;
	return {
		json: simplify ? simplifyRecord(model, record) : record,
		pairedItem: { item: itemIndex },
	};
}

function refOf(context: IExecuteFunctions, itemIndex: number): RecordRef {
	return {
		typeId: context.getNodeParameter('typeId', itemIndex) as string,
		recordId: (context.getNodeParameter('recordId', itemIndex) as string).trim(),
	};
}

async function findTrashItem(
	context: IExecuteFunctions,
	ref: RecordRef,
	itemIndex: number,
): Promise<IDataObject> {
	for (let page = 1; page <= 50; page++) {
		const response = await apiRequest(context, 'POST', '/trash/query', {
			kinds: ['record'],
			typeIds: [ref.typeId],
			page,
			pageSize: 100,
		});
		const items = (response.items as IDataObject[]) ?? [];
		const item = items.find((candidate) => candidate.targetId === ref.recordId);
		if (item) {
			return item;
		}
		if (items.length < 100) {
			break;
		}
	}
	throw new NodeOperationError(context.getNode(), `Record "${ref.recordId}" is not in Trash`, {
		itemIndex,
		description:
			'Only records moved to Trash within the last 30 days can be restored. Records deleted permanently cannot be restored.',
	});
}

export const recordHandlers: Record<string, Handler> = {
	create: async function (this: IExecuteFunctions, itemIndex: number) {
		const model = await discoverModel(this);
		const typeId = this.getNodeParameter('typeId', itemIndex) as string;
		requireType(this, model, typeId, itemIndex);
		const entries = entriesOf(
			this.getNodeParameter('fields', itemIndex, {}) as IDataObject,
			'field',
		);
		const additional = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
		const result = await mutate(
			this,
			model,
			{
				action: 'create',
				typeId,
				fields: fieldAssignments(this, model, typeId, entries as FieldEntry[], itemIndex),
				...sharedChanges(this, additional, itemIndex),
			},
			itemIndex,
		);
		const ref = (result.refs as RecordRef[] | undefined)?.find(
			(candidate) => candidate.typeId === typeId,
		);
		if (!ref) {
			return { json: result, pairedItem: { item: itemIndex } };
		}
		return output(this, model, await readRecord(this, model, ref), itemIndex);
	},
	get: async function (this: IExecuteFunctions, itemIndex: number) {
		const model = await discoverModel(this);
		const ref = refOf(this, itemIndex);
		requireType(this, model, ref.typeId, itemIndex);
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		return output(
			this,
			model,
			await readRecord(this, model, ref, Boolean(options.includeLinks)),
			itemIndex,
		);
	},
	getAll: async function (this: IExecuteFunctions, itemIndex: number) {
		const model = await discoverModel(this);
		const typeId = this.getNodeParameter('typeId', itemIndex) as string;
		requireType(this, model, typeId, itemIndex);
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = returnAll
			? Number.POSITIVE_INFINITY
			: (this.getNodeParameter('limit', itemIndex) as number);
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const filters = entriesOf(
			this.getNodeParameter('filters', itemIndex, {}) as IDataObject,
			'filter',
		).map((entry) => {
			const fieldId = entry.fieldId as string;
			const operator = entry.operator as string;
			const system = SYSTEM_FIELDS[fieldId];
			const field = system
				? { valueType: system.valueType, multiple: false, options: [], format: {} }
				: requireField(this, model, typeId, fieldId, itemIndex);
			const id = system ? fieldId : (field as { id: string }).id;
			return {
				fieldId: id,
				operator,
				...toFilterValues(field, operator, String(entry.value ?? '')),
			};
		});
		const body: IDataObject = { typeId, filters };
		if (options.search) {
			body.search = options.search;
		}
		if (options.sortField) {
			const sortField = options.sortField as string;
			body.sort = [
				{
					fieldId: SYSTEM_FIELDS[sortField]
						? sortField
						: requireField(this, model, typeId, sortField, itemIndex).id,
					direction: (options.sortDirection as string) ?? 'asc',
				},
			];
		}
		if (options.includeLinks) {
			body.includeRelationships = relationshipIncludes(model, typeId);
		}
		if (typeFields(model, typeId).some((field) => field.valueType === 'channels')) {
			body.includeIdentities = true;
		}
		const results: INodeExecutionData[] = [];
		const pageSize = 100;
		for (let page = 1; ; page++) {
			const response = await apiRequest(this, 'POST', '/records/query', {
				...body,
				page,
				pageSize,
			});
			const records = (response.records as IDataObject[]) ?? [];
			for (const record of records) {
				if (results.length >= limit) {
					return results;
				}
				results.push(output(this, model, record, itemIndex));
			}
			if (records.length < pageSize || page * pageSize >= (response.total as number)) {
				return results;
			}
		}
	},
	update: async function (this: IExecuteFunctions, itemIndex: number) {
		const model = await discoverModel(this);
		const ref = refOf(this, itemIndex);
		requireType(this, model, ref.typeId, itemIndex);
		const entries = entriesOf(
			this.getNodeParameter('fields', itemIndex, {}) as IDataObject,
			'field',
		);
		const changes = sharedChanges(
			this,
			this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject,
			itemIndex,
		);
		if (entries.length === 0 && Object.keys(changes).length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'Add at least one field or additional field to update the record',
				{ itemIndex },
			);
		}
		const current = await readRecord(this, model, ref);
		await mutate(
			this,
			model,
			{
				action: 'update',
				ref,
				expectedVersion: current.version,
				fields: fieldAssignments(this, model, ref.typeId, entries as FieldEntry[], itemIndex),
				...changes,
			},
			itemIndex,
		);
		return output(this, model, await readRecord(this, model, ref), itemIndex);
	},
	delete: async function (this: IExecuteFunctions, itemIndex: number) {
		const model = await discoverModel(this);
		const ref = refOf(this, itemIndex);
		requireType(this, model, ref.typeId, itemIndex);
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const permanent = Boolean(options.permanent);
		const current = await readRecord(this, model, ref);
		const result = await mutate(
			this,
			model,
			{
				action: 'delete',
				ref,
				expectedVersion: current.version,
				...(permanent ? { permanent } : {}),
			},
			itemIndex,
		);
		return {
			json: {
				id: ref.recordId,
				listId: ref.typeId,
				deleted: true,
				permanent,
				trashBatchId: (result.trashBatchId as string | undefined) ?? null,
			},
			pairedItem: { item: itemIndex },
		};
	},
	restore: async function (this: IExecuteFunctions, itemIndex: number) {
		const ref = refOf(this, itemIndex);
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const batchId = ((options.trashBatchId as string | undefined) ?? '').trim();
		const selection = batchId
			? { batchId }
			: { itemIds: [(await findTrashItem(this, ref, itemIndex)).id as string] };
		const result = await settleOperation(
			this,
			await apiRequest(this, 'POST', '/trash/restore', selection),
			itemIndex,
		);
		const restoredItemIds = (result.restoredItemIds as string[] | undefined) ?? [];
		const blocked = (result.blocked as IDataObject[] | undefined) ?? [];
		if (result.status !== 'completed' || restoredItemIds.length === 0 || blocked.length > 0) {
			throw new NodeOperationError(this.getNode(), `Record "${ref.recordId}" was not restored`, {
				itemIndex,
				description: blocked.length
					? `Blocked: ${blocked.map((entry) => entry.reason as string).join(', ')}. Restore the deleted list or parent record first.`
					: 'Trash reported nothing restored.',
			});
		}
		return {
			json: { id: ref.recordId, listId: ref.typeId, restored: true, ...result },
			pairedItem: { item: itemIndex },
		};
	},
};
