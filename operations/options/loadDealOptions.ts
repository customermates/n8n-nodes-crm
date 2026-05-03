import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { getBaseURL } from '../../helpers/getBaseURL';
import type { paths } from '../../lib/generated/types';

export async function loadDealOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('customermatesApi');

	try {
		type SearchRequest = NonNullable<
			paths['/v1/deals/search']['post']['requestBody']
		>['content']['application/json'];
		type SearchResponse =
			paths['/v1/deals/search']['post']['responses']['200']['content']['application/json'];

		const body: SearchRequest = {
			pagination: {
				page: 1,
				pageSize: 100,
			},
		};

		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${getBaseURL(credentials)}/api/v1/deals/search`,
			headers: {
				'x-api-key': credentials.apiKey as string,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body,
			json: true,
		})) as SearchResponse;

		if (response.items) {
			return response.items.map((deal) => ({
				name: deal.name,
				value: deal.id,
			}));
		}
	} catch {
		return [];
	}
	return [];
}
