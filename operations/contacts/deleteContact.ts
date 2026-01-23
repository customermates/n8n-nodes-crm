import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type DeleteResponse =
	paths['/v1/contacts/{id}']['delete']['responses']['200']['content']['application/json'];

export async function deleteContact(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const contactId = this.getNodeParameter('contactId', itemIndex) as string;

	const id = (await this.helpers.httpRequest({
		method: 'DELETE',
		url: `${BASE_URL}/api/v1/contacts/${contactId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			Accept: 'application/json',
		},
		json: true,
	})) as DeleteResponse;

	return {
		json: { id },
		pairedItem: { item: itemIndex },
	};
}

export const deleteContactProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['contact'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the contact to delete',
	},
];
