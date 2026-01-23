import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type DeleteResponse =
	paths['/v1/tasks/{id}']['delete']['responses']['200']['content']['application/json'];

export async function deleteTask(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const taskId = this.getNodeParameter('taskId', itemIndex) as string;

	const id = (await this.helpers.httpRequest({
		method: 'DELETE',
		url: `${BASE_URL}/api/v1/tasks/${taskId}`,
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

export const deleteTaskProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'taskId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['task'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the task to delete',
	},
];
