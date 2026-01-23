import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type SearchRequest = NonNullable<
	paths['/v1/tasks/search']['post']['requestBody']
>['content']['application/json'];
type SearchResponse =
	paths['/v1/tasks/search']['post']['responses']['200']['content']['application/json'];

export async function getAllTasks(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		searchTerm?: string;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
	};

	const limit = returnAll
		? 1000
		: (this.getNodeParameter('limit', itemIndex) as 1000 | 25 | 5 | 10 | 100);
	const body: SearchRequest = {
		pagination: {
			page: 1,
			pageSize: limit,
		},
	};

	if (additionalFields.searchTerm) {
		body.searchTerm = additionalFields.searchTerm;
	}

	if (additionalFields.sortBy) {
		body.sortDescriptor = {
			field: additionalFields.sortBy,
			direction: additionalFields.sortDirection || 'asc',
		};
	}

	const response = (await this.helpers.httpRequest({
		method: 'POST',
		url: `${BASE_URL}/api/v1/tasks/search`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body,
		json: true,
	})) as SearchResponse;

	const results: INodeExecutionData[] = [];
	for (const task of response.items) {
		const result: INodeExecutionData = {
			json: task as IDataObject,
			pairedItem: { item: itemIndex },
		};

		if (response.customColumns) {
			result.json._meta = {
				customColumns: response.customColumns,
			};
		}

		results.push(result);
	}

	return results;
}

export const getAllTasksProperties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 25,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter tasks',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Type',
						value: 'type',
					},
					{
						name: 'Created At',
						value: 'createdAt',
					},
					{
						name: 'Updated At',
						value: 'updatedAt',
					},
				],
				default: 'name',
			},
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'asc',
					},
					{
						name: 'Descending',
						value: 'desc',
					},
				],
				default: 'asc',
			},
		],
	},
];
