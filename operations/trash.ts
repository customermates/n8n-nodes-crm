import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Handler } from '../helpers/api';
import { apiRequest, splitList } from '../helpers/api';
import { settleOperation } from '../helpers/model';

const show = (operation: string[], extra: IDataObject = {}) => ({
	show: { resource: ['trash'], operation, ...extra },
});

export const trashProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['trash'] } },
		options: [
			{
				name: 'Delete Permanently',
				value: 'deletePermanently',
				description: 'Permanently delete Trash items and erase their values from history',
				action: 'Delete trash items permanently',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get the items in Trash',
				action: 'Get many trash items',
			},
			{
				name: 'Restore',
				value: 'restore',
				description: 'Restore Trash items, or everything one delete moved to Trash',
				action: 'Restore trash items',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Restore By',
		name: 'restoreBy',
		type: 'options',
		options: [
			{ name: 'Trash Item IDs', value: 'itemIds' },
			{ name: 'Trash Batch ID', value: 'batchId' },
		],
		default: 'itemIds',
		displayOptions: show(['restore']),
	},
	{
		displayName: 'Trash Item IDs',
		name: 'itemIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'id1, id2',
		displayOptions: {
			show: { resource: ['trash'], operation: ['deletePermanently'] },
		},
		description:
			'Comma-separated Trash item IDs, as returned by Get Many (the "ID" of the Trash item, not of the record)',
	},
	{
		displayName: 'Trash Item IDs',
		name: 'itemIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'id1, id2',
		displayOptions: show(['restore'], { restoreBy: ['itemIds'] }),
		description: 'Comma-separated Trash item IDs, as returned by Get Many',
	},
	{
		displayName: 'Trash Batch ID',
		name: 'batchId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['restore'], { restoreBy: ['batchId'] }),
		description: 'The trashBatchId returned when the records were deleted',
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
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{
				displayName: 'Kinds',
				name: 'kinds',
				type: 'multiOptions',
				options: [
					{ name: 'Field', value: 'field' },
					{ name: 'Knowledge Base Page', value: 'wikiPage' },
					{ name: 'List', value: 'list' },
					{ name: 'Record', value: 'record' },
					{ name: 'Relationship', value: 'relationship' },
					{ name: 'Routine', value: 'routine' },
					{ name: 'View', value: 'view' },
					{ name: 'Widget', value: 'widget' },
				],
				default: [],
				description: 'Only return Trash items of these kinds',
			},
			{
				displayName: 'List Names or IDs',
				name: 'typeIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'loadListOptions' },
				default: [],
				description:
					'Only return Trash items of these lists. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to search for in the Trash item labels',
			},
		],
	},
];

function itemIdsOf(context: IExecuteFunctions, itemIndex: number): string[] {
	const ids = splitList(context.getNodeParameter('itemIds', itemIndex) as string);
	if (ids.length === 0) {
		throw new NodeOperationError(context.getNode(), 'Provide at least one Trash item ID', {
			itemIndex,
		});
	}
	return ids;
}

export const trashHandlers: Record<string, Handler> = {
	getAll: async function (this: IExecuteFunctions, itemIndex: number) {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = returnAll
			? Number.POSITIVE_INFINITY
			: (this.getNodeParameter('limit', itemIndex) as number);
		const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
		const body: IDataObject = {};
		if ((filters.kinds as string[] | undefined)?.length) body.kinds = filters.kinds;
		if ((filters.typeIds as string[] | undefined)?.length) body.typeIds = filters.typeIds;
		if (filters.search) body.search = filters.search;
		const results: INodeExecutionData[] = [];
		const pageSize = 100;
		for (let page = 1; ; page++) {
			const response = await apiRequest(this, 'POST', '/trash/query', { ...body, page, pageSize });
			const items = (response.items as IDataObject[]) ?? [];
			for (const item of items) {
				if (results.length >= limit) {
					return results;
				}
				results.push({ json: item, pairedItem: { item: itemIndex } });
			}
			if (items.length < pageSize || page * pageSize >= (response.total as number)) {
				return results;
			}
		}
	},
	restore: async function (this: IExecuteFunctions, itemIndex: number) {
		const restoreBy = this.getNodeParameter('restoreBy', itemIndex) as string;
		const selection =
			restoreBy === 'batchId'
				? { batchId: (this.getNodeParameter('batchId', itemIndex) as string).trim() }
				: { itemIds: itemIdsOf(this, itemIndex) };
		const result = await settleOperation(
			this,
			await apiRequest(this, 'POST', '/trash/restore', selection),
			itemIndex,
		);
		const restoredItemIds = (result.restoredItemIds as string[] | undefined) ?? [];
		const blocked = (result.blocked as IDataObject[] | undefined) ?? [];
		return {
			json: {
				restored:
					result.status === 'completed' && restoredItemIds.length > 0 && blocked.length === 0,
				...result,
			},
			pairedItem: { item: itemIndex },
		};
	},
	deletePermanently: async function (this: IExecuteFunctions, itemIndex: number) {
		const itemIds = itemIdsOf(this, itemIndex);
		const preview = await apiRequest(this, 'POST', '/trash/preview', { itemIds });
		const result = await apiRequest(this, 'POST', '/trash/delete-permanently', {
			itemIds,
			expectedImpactHash: preview.impactHash,
		});
		const failed = (result.failedItemIds as string[] | undefined) ?? [];
		if (failed.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				`${failed.length} Trash item(s) could not be deleted permanently: ${failed.join(', ')}`,
				{ itemIndex },
			);
		}
		const pending = (result.pendingItemIds as string[] | undefined) ?? [];
		return {
			json: {
				deleted: pending.length === 0,
				...result,
				removedRecords: preview.removedRecords,
				removedLinks: preview.removedLinks,
			},
			pairedItem: { item: itemIndex },
		};
	},
};
