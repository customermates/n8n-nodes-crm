import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

export async function getAllContacts(
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

	type SearchRequest = NonNullable<
		paths['/v1/contacts/search']['post']['requestBody']
	>['content']['application/json'];
	type SearchResponse =
		paths['/v1/contacts/search']['post']['responses']['200']['content']['application/json'];

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
		url: `${BASE_URL}/api/v1/contacts/search`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body,
		json: true,
	})) as SearchResponse;

	const results: INodeExecutionData[] = [];
	for (const contact of response.items) {
		const result: INodeExecutionData = {
			json: contact as IDataObject,
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
