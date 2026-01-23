import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type DeleteResponse =
	paths['/v1/services/{id}']['delete']['responses']['200']['content']['application/json'];

export async function deleteService(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const serviceId = this.getNodeParameter('serviceId', itemIndex) as string;

	const id = (await this.helpers.httpRequest({
		method: 'DELETE',
		url: `${BASE_URL}/api/v1/services/${serviceId}`,
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

export const deleteServiceProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'serviceId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['service'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the service to delete',
	},
];
