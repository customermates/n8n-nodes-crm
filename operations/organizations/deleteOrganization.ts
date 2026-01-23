import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type DeleteResponse =
	paths['/v1/organizations/{id}']['delete']['responses']['200']['content']['application/json'];

export async function deleteOrganization(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const organizationId = this.getNodeParameter('organizationId', itemIndex) as string;

	const id = (await this.helpers.httpRequest({
		method: 'DELETE',
		url: `${BASE_URL}/api/v1/organizations/${organizationId}`,
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

export const deleteOrganizationProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'organizationId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['organization'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the organization to delete',
	},
];
