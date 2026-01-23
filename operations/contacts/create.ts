import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

export async function createContact(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const firstName = this.getNodeParameter('firstName', itemIndex) as string;
	const lastName = this.getNodeParameter('lastName', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		organizationIds?: string[];
		userIds?: string[];
		dealIds?: string[];
		customFieldValues?: {
			field?: Array<{
				columnId: string;
				value: string;
			}>;
		};
	};

	type CreateRequest = NonNullable<
		paths['/v1/contacts']['post']['requestBody']
	>['content']['application/json'];
	type CreateSuccessResponse =
		paths['/v1/contacts']['post']['responses']['201']['content']['application/json'];

	const requestBody: CreateRequest = {
		firstName,
		lastName,
		organizationIds: additionalFields.organizationIds || [],
		userIds: additionalFields.userIds || [],
		dealIds: additionalFields.dealIds || [],
		customFieldValues: additionalFields.customFieldValues?.field || [],
	};

	const response = (await this.helpers.httpRequest({
		method: 'POST',
		url: `${BASE_URL}/api/v1/contacts`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: requestBody,
		json: true,
	})) as CreateSuccessResponse;

	return {
		json: response,
		pairedItem: { item: itemIndex },
	};
}
