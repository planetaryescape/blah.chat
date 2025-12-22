/**
 * Configuration returned from BYOD credentials query
 */
export interface BYODConfig {
	connectionStatus: string;
	lastConnectionTest?: number;
	connectionError?: string;
	deploymentStatus?: string;
	schemaVersion: number;
	lastSchemaDeploy?: number;
}

