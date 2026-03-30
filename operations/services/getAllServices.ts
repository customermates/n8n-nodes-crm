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
	paths['/v1/services/search']['post']['requestBody']
>['content']['application/json'];
type SearchResponse =
	paths['/v1/services/search']['post']['responses']['200']['content']['application/json'];

export async function getAllServices(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
	const requestedLimit = returnAll ? Number.POSITIVE_INFINITY : (this.getNodeParameter('limit', itemIndex) as number);
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		searchTerm?: string;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
	};
	const pageSize: 5 | 10 | 25 | 100 = 100;
	const results: INodeExecutionData[] = [];
	let page = 1;

	while (results.length < requestedLimit) {
		const body: SearchRequest = {
			pagination: {
				page,
				pageSize,
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
			url: `${BASE_URL}/api/v1/services/search`,
			headers: {
				'x-api-key': credentials.apiKey as string,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body,
			json: true,
		})) as SearchResponse;

		for (const service of response.items) {
			if (results.length >= requestedLimit) {
				break;
			}

			const result: INodeExecutionData = {
				json: service as IDataObject,
				pairedItem: { item: itemIndex },
			};

			if (response.customColumns) {
				result.json._meta = {
					customColumns: response.customColumns,
				};
			}

			results.push(result);
		}

		if (response.items.length < pageSize) {
			break;
		}

		page += 1;
	}

	return results;
}

export const getAllServicesProperties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['service'],
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
				resource: ['service'],
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
				resource: ['service'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter services',
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
						name: 'Amount',
						value: 'amount',
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
