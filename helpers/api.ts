import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export const BASE_URL = 'https://customermates.com';

export async function apiRequest<T = IDataObject>(
	context: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<T> {
	const credentials = await context.getCredentials('customermatesApi');
	const baseURL = ((credentials.baseURL as string) || BASE_URL).replace(/\/+$/, '');

	return await context.helpers.httpRequest({
		method,
		url: `${baseURL}/api/v1${path}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body,
		json: true,
	});
}

export function splitList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function withMeta(record: IDataObject, response: IDataObject): IDataObject {
	if (response.customColumns) {
		return { ...record, _meta: { customColumns: response.customColumns } };
	}
	return record;
}

export async function searchAll(
	context: IExecuteFunctions,
	path: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = returnAll
		? Number.POSITIVE_INFINITY
		: (context.getNodeParameter('limit', itemIndex) as number);
	const options = context.getNodeParameter('additionalFields', itemIndex, {}) as {
		searchTerm?: string;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
	};
	const results: INodeExecutionData[] = [];
	let page = 1;

	for (;;) {
		const body: IDataObject = { pagination: { page, pageSize: 100 } };
		if (options.searchTerm) {
			body.searchTerm = options.searchTerm;
		}
		if (options.sortBy) {
			body.sortDescriptor = { field: options.sortBy, direction: options.sortDirection ?? 'asc' };
		}

		const response = await apiRequest(context, 'POST', path, body);
		const items = (response.items as IDataObject[]) ?? [];

		for (const item of items) {
			if (results.length >= limit) {
				return results;
			}
			results.push({ json: withMeta(item, response), pairedItem: { item: itemIndex } });
		}

		if (items.length < 100) {
			return results;
		}
		page += 1;
	}
}
