import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type DeleteResponse =
	paths['/v1/deals/{id}']['delete']['responses']['200']['content']['application/json'];

export async function deleteDeal(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const dealId = this.getNodeParameter('dealId', itemIndex) as string;

	const id = (await this.helpers.httpRequest({
		method: 'DELETE',
		url: `${BASE_URL}/api/v1/deals/${dealId}`,
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

export const deleteDealProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'dealId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['deal'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the deal to delete',
	},
];
