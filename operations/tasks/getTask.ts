import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type GetTaskSuccessResponse =
	paths['/v1/tasks/{id}']['get']['responses']['200']['content']['application/json'];

export async function getTask(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const taskId = this.getNodeParameter('taskId', itemIndex) as string;

	const response = (await this.helpers.httpRequest({
		method: 'GET',
		url: `${BASE_URL}/api/v1/tasks/${taskId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			Accept: 'application/json',
		},
		json: true,
	})) as GetTaskSuccessResponse;

	if (!response.task) {
		throw new NodeOperationError(this.getNode(), `Task with ID "${taskId}" not found`, {
			itemIndex,
		});
	}

	const task = response.task as IDataObject;
	const result: INodeExecutionData = {
		json: task,
		pairedItem: { item: itemIndex },
	};

	if (response.customColumns) {
		result.json._meta = {
			customColumns: response.customColumns,
		};
	}

	return result;
}

export const getTaskProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'taskId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['task'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the task to retrieve',
	},
];
