import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

export class GetContacts implements INodeType {
	methods = {};
	description: INodeTypeDescription = {
		displayName: 'Get Contacts',
		name: 'getContacts',
		icon: 'file:../../static/customermates.svg',
		group: ['transform'],
		version: 1,
		description: 'Retrieve contacts from Customermates',
		defaults: {
			name: 'Get Contacts',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'customermatesApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter contacts',
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
			{
				displayName: 'Max Items',
				name: 'maxItems',
				type: 'options',
				options: [
					{
						name: '5',
						value: 5,
					},
					{
						name: '10',
						value: 10,
					},
					{
						name: '25',
						value: 25,
					},
					{
						name: '100',
						value: 100,
					},
					{
						name: '1000',
						value: 1000,
					},
				],
				default: 25,
				description: 'Maximum number of contacts to retrieve',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		try {
			const credentials = await this.getCredentials('customermatesApi');
			const maxItems = this.getNodeParameter('maxItems', 0, 25) as 5 | 10 | 25 | 100 | 1000;
			const searchTerm = this.getNodeParameter('searchTerm', 0, '') as string;
			const sortBy = this.getNodeParameter('sortBy', 0, 'name') as string;
			const sortDirection = this.getNodeParameter('sortDirection', 0, 'asc') as 'asc' | 'desc';

			type SearchRequest = NonNullable<
				paths['/v1/contacts/search']['post']['requestBody']
			>['content']['application/json'];
			type SearchResponse =
				paths['/v1/contacts/search']['post']['responses']['200']['content']['application/json'];

			const body: SearchRequest = {
				pagination: {
					page: 1,
					pageSize: maxItems,
				},
			};

			if (searchTerm) {
				body.searchTerm = searchTerm;
			}

			if (sortBy) {
				body.sortDescriptor = {
					field: sortBy,
					direction: sortDirection,
				};
			}

			const response = (await this.helpers.httpRequest({
				method: 'POST',
				url: `${BASE_URL}/api/v1/contacts/search`,
				headers: {
					'x-api-key': credentials.apiKey,
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body,
				json: true,
			})) as SearchResponse;

			for (const contact of response.items) {
				const result: INodeExecutionData = {
					json: contact as IDataObject,
				};

				if (response.customColumns) {
					result.json._meta = {
						customColumns: response.customColumns,
					};
				}

				returnData.push(result);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
				});
			} else {
				throw new NodeOperationError(this.getNode(), error);
			}
		}

		return [returnData];
	}
}
