import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

export async function loadOrganizationCustomColumnOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('customermatesApi');

	try {
		type ConfigResponse =
			paths['/v1/organizations/configuration']['get']['responses']['200']['content']['application/json'];
		const response = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${BASE_URL}/api/v1/organizations/configuration`,
			headers: {
				'x-api-key': credentials.apiKey as string,
				Accept: 'application/json',
			},
			json: true,
		})) as ConfigResponse;

		if (response.customColumns) {
			return response.customColumns.map((column) => ({
				name: column.label || column.id,
				value: column.id,
			}));
		}
	} catch {
		return [];
	}
	return [];
}
