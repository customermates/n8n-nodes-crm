import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

export async function updateContact(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const contactId = this.getNodeParameter('contactId', itemIndex) as string;
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as {
		firstName?: string;
		lastName?: string;
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

	type UpdateRequest = NonNullable<
		paths['/v1/contacts/{id}']['put']['requestBody']
	>['content']['application/json'];
	type UpdateSuccessResponse =
		paths['/v1/contacts/{id}']['put']['responses']['200']['content']['application/json'];

	const requestBody: UpdateRequest = {};

	if (updateFields.firstName !== undefined) {
		requestBody.firstName = updateFields.firstName;
	}
	if (updateFields.lastName !== undefined) {
		requestBody.lastName = updateFields.lastName;
	}
	if (updateFields.organizationIds !== undefined) {
		requestBody.organizationIds = updateFields.organizationIds;
	}
	if (updateFields.userIds !== undefined) {
		requestBody.userIds = updateFields.userIds;
	}
	if (updateFields.dealIds !== undefined) {
		requestBody.dealIds = updateFields.dealIds;
	}
	if (updateFields.customFieldValues?.field !== undefined) {
		const seenColumnIds = new Set<string>();
		requestBody.customFieldValues = updateFields.customFieldValues.field.filter((field) => {
			if (seenColumnIds.has(field.columnId)) {
				return false;
			}
			seenColumnIds.add(field.columnId);
			return true;
		});
	}

	if (Object.keys(requestBody).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one field must be provided in Update Fields to update the contact',
			{ itemIndex },
		);
	}

	const response = (await this.helpers.httpRequest({
		method: 'PUT',
		url: `${BASE_URL}/api/v1/contacts/${contactId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: requestBody,
		json: true,
	})) as UpdateSuccessResponse;

	return {
		json: response,
		pairedItem: { item: itemIndex },
	};
}
