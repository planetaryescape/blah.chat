"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Database,
	ExternalLink,
	Eye,
	EyeOff,
	HelpCircle,
	Loader2,
	Plus,
	Settings2,
	XCircle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ===== Main Component =====

export function BYODSettings() {
	const [showConfigForm, setShowConfigForm] = useState(false);
	const [showDisconnect, setShowDisconnect] = useState(false);
	const [showInfo, setShowInfo] = useState(false);

	// Query BYOD config
	// @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
	const config = useQuery(api.byod.credentials.getConfig);
	const isLoading = config === undefined;
	const isConnected = config?.connectionStatus === "connected";
	const hasConfig = config !== null;

	if (isLoading) {
		return <BYODSettingsSkeleton />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold">Bring Your Own Database</h2>
					<p className="text-sm text-muted-foreground">
						Store your conversations and data on your own Convex instance.
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setShowInfo(true)}
					className="flex-shrink-0"
				>
					<HelpCircle className="h-5 w-5" />
				</Button>
			</div>

			{/* Connection Status */}
			{hasConfig && <ConnectionStatusCard config={config} />}

			{/* Not Configured - Show Setup */}
			{!hasConfig && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Database className="h-5 w-5" />
							Connect Your Database
						</CardTitle>
						<CardDescription>
							Use your own Convex instance to store your data. You maintain full
							control and can export anytime.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{showConfigForm ? (
							<BYODConfigForm
								onSuccess={() => {
									setShowConfigForm(false);
									toast.success("BYOD configured successfully!");
								}}
								onCancel={() => setShowConfigForm(false)}
							/>
						) : (
							<div className="space-y-4">
								<div className="rounded-lg bg-muted/50 p-4">
									<h4 className="font-medium mb-2">Before you start</h4>
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>1. Create a Convex account at convex.dev</li>
										<li>2. Create a new project for blah.chat</li>
										<li>3. Get your deploy key from Settings → Deploy Key</li>
									</ul>
								</div>
								<Button onClick={() => setShowConfigForm(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Configure BYOD
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Configured - Show Info */}
			{hasConfig && !showConfigForm && (
				<>
					<InstanceInfoCard config={config} />

					{/* Actions */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Settings2 className="h-5 w-5" />
								Manage Connection
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => setShowConfigForm(true)}
								>
									Update Credentials
								</Button>
								<Button
									variant="destructive"
									onClick={() => setShowDisconnect(true)}
								>
									Disconnect
								</Button>
							</div>
						</CardContent>
					</Card>
				</>
			)}

			{/* Update Credentials Form */}
			{hasConfig && showConfigForm && (
				<Card>
					<CardHeader>
						<CardTitle>Update Credentials</CardTitle>
						<CardDescription>
							Update your Convex deployment URL or deploy key.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<BYODConfigForm
							isUpdate
							onSuccess={() => {
								setShowConfigForm(false);
								toast.success("Credentials updated successfully!");
							}}
							onCancel={() => setShowConfigForm(false)}
						/>
					</CardContent>
				</Card>
			)}

			{/* Disconnect Dialog */}
			<DisconnectDialog open={showDisconnect} onOpenChange={setShowDisconnect} />

			{/* Info Dialog */}
			<BYODInfoDialog open={showInfo} onOpenChange={setShowInfo} />
		</div>
	);
}

// ===== Skeleton =====

function BYODSettingsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="h-6 w-48 bg-muted animate-pulse rounded" />
			<div className="h-32 bg-muted animate-pulse rounded-lg" />
		</div>
	);
}

// ===== Config Form =====

interface BYODConfigFormProps {
	isUpdate?: boolean;
	onSuccess: () => void;
	onCancel: () => void;
}

function BYODConfigForm({ isUpdate, onSuccess, onCancel }: BYODConfigFormProps) {
	const [deploymentUrl, setDeploymentUrl] = useState("");
	const [deployKey, setDeployKey] = useState("");
	const [showKey, setShowKey] = useState(false);
	const [testStatus, setTestStatus] = useState<
		"idle" | "testing" | "success" | "error"
	>("idle");
	const [testError, setTestError] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "deploying" | "success" | "error"
	>("idle");
	const [saveError, setSaveError] = useState<string | null>(null);

	// @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
	const saveCredentials = useAction(api.byod.saveCredentials.saveCredentials);
	// @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
	const testConnection = useAction(api.byod.testConnection.testConnection);
	// @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
	const deploy = useAction(api.byod.deploy.deployToUserInstance);

	const validateUrl = (url: string): boolean => {
		try {
			const parsed = new URL(url);
			return parsed.protocol === "https:";
		} catch {
			return false;
		}
	};

	const handleTest = async () => {
		if (!deploymentUrl || !deployKey) return;

		setTestStatus("testing");
		setTestError(null);

		try {
			// First save credentials
			await saveCredentials({ deploymentUrl, deployKey });

			// Then test connection
			const result = await testConnection({});

			if (result.success) {
				setTestStatus("success");
			} else {
				setTestStatus("error");
				setTestError(result.message || "Connection test failed");
			}
		} catch (error) {
			setTestStatus("error");
			setTestError(error instanceof Error ? error.message : "Test failed");
		}
	};

	const handleSaveAndDeploy = async () => {
		if (!deploymentUrl || !deployKey) return;

		setSaveStatus("saving");
		setSaveError(null);

		try {
			// Save credentials
			await saveCredentials({ deploymentUrl, deployKey });

			setSaveStatus("deploying");

			// Deploy schema
			await deploy({});

			setSaveStatus("success");
			setTimeout(onSuccess, 1000);
		} catch (error) {
			setSaveStatus("error");
			setSaveError(error instanceof Error ? error.message : "Deployment failed");
		}
	};

	const isUrlValid = deploymentUrl ? validateUrl(deploymentUrl) : true;
	const canTest = deploymentUrl && deployKey && isUrlValid;
	const canSave = testStatus === "success";

	return (
		<div className="space-y-4">
			{/* Deployment URL */}
			<div className="space-y-2">
				<Label htmlFor="deploymentUrl">Convex Deployment URL</Label>
				<Input
					id="deploymentUrl"
					type="url"
					placeholder="https://your-project.convex.cloud"
					value={deploymentUrl}
					onChange={(e) => setDeploymentUrl(e.target.value)}
					className={deploymentUrl && !isUrlValid ? "border-destructive" : ""}
				/>
				{deploymentUrl && !isUrlValid && (
					<p className="text-sm text-destructive">Must be a valid HTTPS URL</p>
				)}
			</div>

			{/* Deploy Key */}
			<div className="space-y-2">
				<Label htmlFor="deployKey">Deploy Key</Label>
				<div className="relative">
					<Input
						id="deployKey"
						type={showKey ? "text" : "password"}
						placeholder="prod:your-deploy-key"
						value={deployKey}
						onChange={(e) => setDeployKey(e.target.value)}
						className="pr-10"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute right-0 top-0 h-full"
						onClick={() => setShowKey(!showKey)}
					>
						{showKey ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					Find this in Convex Dashboard → Settings → Deploy Key
				</p>
			</div>

			{/* Test Result */}
			{testStatus === "success" && (
				<Alert className="border-green-500/50 bg-green-500/10">
					<CheckCircle className="h-4 w-4 text-green-500" />
					<AlertDescription className="text-green-500">
						Connection successful! Ready to deploy.
					</AlertDescription>
				</Alert>
			)}

			{testStatus === "error" && testError && (
				<Alert variant="destructive">
					<XCircle className="h-4 w-4" />
					<AlertDescription>{testError}</AlertDescription>
				</Alert>
			)}

			{saveStatus === "error" && saveError && (
				<Alert variant="destructive">
					<XCircle className="h-4 w-4" />
					<AlertDescription>{saveError}</AlertDescription>
				</Alert>
			)}

			{/* Actions */}
			<div className="flex gap-2 pt-2">
				<Button variant="outline" onClick={onCancel}>
					Cancel
				</Button>

				<Button
					variant="secondary"
					onClick={handleTest}
					disabled={!canTest || testStatus === "testing"}
				>
					{testStatus === "testing" && (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					)}
					Test Connection
				</Button>

				<Button
					onClick={handleSaveAndDeploy}
					disabled={
						!canSave || saveStatus === "saving" || saveStatus === "deploying"
					}
				>
					{(saveStatus === "saving" || saveStatus === "deploying") && (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					)}
					{saveStatus === "deploying" ? "Deploying..." : "Save & Deploy"}
				</Button>
			</div>
		</div>
	);
}

// ===== Connection Status Card =====

interface BYODConfig {
	connectionStatus: string;
	lastConnectionTest?: number;
	connectionError?: string;
	deploymentStatus?: string;
	schemaVersion: number;
	lastSchemaDeploy?: number;
}

function ConnectionStatusCard({ config }: { config: BYODConfig }) {
	const getStatusDisplay = () => {
		switch (config.connectionStatus) {
			case "connected":
				return {
					icon: <CheckCircle className="h-5 w-5 text-green-500" />,
					badge: (
						<Badge variant="default" className="bg-green-500">
							Connected
						</Badge>
					),
					message: "Your database is connected and working.",
				};
			case "pending":
				return {
					icon: <Clock className="h-5 w-5 text-yellow-500" />,
					badge: <Badge variant="secondary">Pending</Badge>,
					message: "Waiting for connection verification.",
				};
			case "error":
				return {
					icon: <XCircle className="h-5 w-5 text-red-500" />,
					badge: <Badge variant="destructive">Error</Badge>,
					message: config.connectionError || "Connection failed.",
				};
			case "disconnected":
				return {
					icon: <XCircle className="h-5 w-5 text-muted-foreground" />,
					badge: <Badge variant="outline">Disconnected</Badge>,
					message: "Database disconnected. Reconnect to use BYOD.",
				};
			default:
				return {
					icon: <Clock className="h-5 w-5" />,
					badge: <Badge variant="outline">Unknown</Badge>,
					message: "Unknown status.",
				};
		}
	};

	const status = getStatusDisplay();
	const lastTest = config.lastConnectionTest
		? new Date(config.lastConnectionTest).toLocaleString()
		: "Never";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						{status.icon}
						Connection Status
					</CardTitle>
					{status.badge}
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">{status.message}</p>
				<p className="text-xs text-muted-foreground mt-2">
					Last checked: {lastTest}
				</p>
			</CardContent>
		</Card>
	);
}

// ===== Instance Info Card =====

function InstanceInfoCard({ config }: { config: BYODConfig }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Database className="h-5 w-5" />
					Instance Information
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Schema Version</span>
					<span className="font-medium">v{config.schemaVersion}</span>
				</div>
				{config.lastSchemaDeploy && (
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Last Deployed</span>
						<span className="font-medium">
							{new Date(config.lastSchemaDeploy).toLocaleString()}
						</span>
					</div>
				)}
				{config.deploymentStatus && (
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Deployment Status</span>
						<Badge
							variant={
								config.deploymentStatus === "deployed" ? "default" : "secondary"
							}
						>
							{config.deploymentStatus}
						</Badge>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ===== Disconnect Dialog =====

type DisconnectOption = "keep" | "migrate" | "delete";

interface DisconnectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function DisconnectDialog({ open, onOpenChange }: DisconnectDialogProps) {
	const [option, setOption] = useState<DisconnectOption>("keep");
	const [status, setStatus] = useState<
		"idle" | "processing" | "success" | "error"
	>("idle");
	const [error, setError] = useState<string | null>(null);

	// @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
	const disconnect = useMutation(api.byod.credentials.disconnect);

	const handleDisconnect = async () => {
		setStatus("processing");
		setError(null);

		try {
			// For now, only support "keep" option
			// migrate and delete would require additional backend work
			if (option !== "keep") {
				toast.info("Migrate and delete options coming soon. Using 'keep' for now.");
			}

			await disconnect({});

			setStatus("success");
			toast.success("BYOD disconnected successfully");
			setTimeout(() => {
				onOpenChange(false);
				setStatus("idle");
			}, 1000);
		} catch (err) {
			setStatus("error");
			setError(err instanceof Error ? err.message : "Disconnect failed");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Disconnect BYOD</DialogTitle>
					<DialogDescription>
						Choose what happens to your data when you disconnect.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<RadioGroup
						value={option}
						onValueChange={(v) => setOption(v as DisconnectOption)}
					>
						<div className="flex items-start space-x-3 p-3 rounded-lg border">
							<RadioGroupItem value="keep" id="keep" className="mt-1" />
							<div>
								<Label htmlFor="keep" className="font-medium">
									Keep data on your instance
								</Label>
								<p className="text-sm text-muted-foreground">
									Data stays on your Convex instance. You can access it via
									Convex dashboard or reconnect later.
								</p>
							</div>
						</div>

						<div className="flex items-start space-x-3 p-3 rounded-lg border opacity-50">
							<RadioGroupItem
								value="migrate"
								id="migrate"
								className="mt-1"
								disabled
							/>
							<div>
								<Label htmlFor="migrate" className="font-medium">
									Migrate back to blah.chat (Coming Soon)
								</Label>
								<p className="text-sm text-muted-foreground">
									Move all your data back to blah.chat servers.
								</p>
							</div>
						</div>

						<div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/50 opacity-50">
							<RadioGroupItem
								value="delete"
								id="delete"
								className="mt-1"
								disabled
							/>
							<div>
								<Label htmlFor="delete" className="font-medium text-destructive">
									Delete data from your instance (Coming Soon)
								</Label>
								<p className="text-sm text-muted-foreground">
									Permanently delete all your data from your Convex instance.
								</p>
							</div>
						</div>
					</RadioGroup>

					{option === "delete" && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								This will permanently delete all your conversations, messages,
								memories, and files from your Convex instance.
							</AlertDescription>
						</Alert>
					)}

					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant={option === "delete" ? "destructive" : "default"}
						onClick={handleDisconnect}
						disabled={status === "processing"}
					>
						{status === "processing" && (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						)}
						{option === "delete" ? "Delete & Disconnect" : "Disconnect"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ===== Info Dialog =====

interface BYODInfoDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function BYODInfoDialog({ open, onOpenChange }: BYODInfoDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Database className="h-5 w-5" />
						About Bring Your Own Database
					</DialogTitle>
					<DialogDescription>
						Complete data ownership with your own Convex instance
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[60vh] pr-4">
					<div className="space-y-6">
						{/* What is BYOD */}
						<section className="space-y-2">
							<h3 className="font-semibold">What is BYOD?</h3>
							<p className="text-sm text-muted-foreground">
								BYOD (Bring Your Own Database) lets you store your personal data on
								your own Convex instance instead of blah.chat's servers. Your conversations,
								messages, memories, files, and projects are stored in a database you control.
							</p>
						</section>

						{/* Why use BYOD */}
						<section className="space-y-2">
							<h3 className="font-semibold">Why use BYOD?</h3>
							<ul className="text-sm text-muted-foreground space-y-1.5">
								<li className="flex gap-2">
									<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
									<span><strong>Data ownership</strong> — Your data lives in your database, export anytime</span>
								</li>
								<li className="flex gap-2">
									<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
									<span><strong>Privacy</strong> — Only you have access to your stored conversations</span>
								</li>
								<li className="flex gap-2">
									<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
									<span><strong>Portability</strong> — If blah.chat shuts down, your data persists</span>
								</li>
								<li className="flex gap-2">
									<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
									<span><strong>Direct access</strong> — Query your data directly via Convex dashboard</span>
								</li>
							</ul>
						</section>

						{/* How it works */}
						<section className="space-y-2">
							<h3 className="font-semibold">How it works</h3>
							<div className="text-sm text-muted-foreground space-y-2">
								<p>
									blah.chat uses a two-database architecture:
								</p>
								<div className="rounded-lg bg-muted/50 p-3 space-y-2">
									<div>
										<span className="font-medium text-foreground">Main database (blah.chat)</span>
										<p className="text-xs">User accounts, settings, preferences, templates, admin data</p>
									</div>
									<div>
										<span className="font-medium text-foreground">Your database (BYOD)</span>
										<p className="text-xs">Conversations, messages, memories, files, projects, notes, tasks</p>
									</div>
								</div>
								<p>
									When you send a message, it flows through blah.chat for AI processing,
									then gets stored on your Convex instance. blah.chat never persists your
									conversation content on its servers.
								</p>
							</div>
						</section>

						{/* What you need */}
						<section className="space-y-2">
							<h3 className="font-semibold">What you need</h3>
							<ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
								<li>
									<strong>Convex account</strong> — Free tier works fine
									<Button
										variant="link"
										size="sm"
										className="h-auto p-0 ml-1"
										asChild
									>
										<a href="https://convex.dev" target="_blank" rel="noopener noreferrer">
											convex.dev <ExternalLink className="h-3 w-3 ml-0.5 inline" />
										</a>
									</Button>
								</li>
								<li>
									<strong>New Convex project</strong> — Create one specifically for blah.chat
								</li>
								<li>
									<strong>Deploy key</strong> — Found in Convex Dashboard → Settings → Deploy Key
								</li>
							</ol>
						</section>

						{/* Setup steps */}
						<section className="space-y-2">
							<h3 className="font-semibold">Setup steps</h3>
							<ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
								<li>Create a new project at dashboard.convex.dev</li>
								<li>Go to Settings → Deploy Key and copy it</li>
								<li>Copy your deployment URL (e.g., https://your-project.convex.cloud)</li>
								<li>Enter both in the form below and click "Test Connection"</li>
								<li>If successful, click "Save & Deploy" to deploy the schema</li>
								<li>Done! Your data will now be stored on your instance</li>
							</ol>
						</section>

						{/* Cost implications */}
						<section className="space-y-2">
							<h3 className="font-semibold">Cost implications</h3>
							<div className="text-sm text-muted-foreground">
								<p>
									With BYOD, <strong>you pay for your own Convex usage</strong>. Convex offers
									a generous free tier that's sufficient for most personal use:
								</p>
								<ul className="mt-2 space-y-1 list-disc list-inside">
									<li>1M function calls/month</li>
									<li>1GB database storage</li>
									<li>1GB file storage</li>
								</ul>
								<p className="mt-2">
									Check <a href="https://convex.dev/pricing" target="_blank" rel="noopener noreferrer" className="underline">Convex pricing</a> for
									details. Heavy usage may require their paid plan.
								</p>
							</div>
						</section>

						{/* What happens when disconnecting */}
						<section className="space-y-2">
							<h3 className="font-semibold">Disconnecting BYOD</h3>
							<p className="text-sm text-muted-foreground">
								When you disconnect, you choose what happens to your data:
							</p>
							<ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
								<li className="flex gap-2">
									<span className="font-medium text-foreground">Keep:</span>
									<span>Data stays on your instance, accessible via Convex dashboard</span>
								</li>
								<li className="flex gap-2">
									<span className="font-medium text-foreground">Migrate:</span>
									<span>Move data back to blah.chat servers (coming soon)</span>
								</li>
								<li className="flex gap-2">
									<span className="font-medium text-foreground">Delete:</span>
									<span>Permanently remove from your instance (coming soon)</span>
								</li>
							</ul>
						</section>

						{/* Connection issues */}
						<section className="space-y-2">
							<h3 className="font-semibold">Connection issues</h3>
							<p className="text-sm text-muted-foreground">
								If your database becomes unreachable, blah.chat will block the app to
								protect data integrity. You'll see a connection error screen with options to:
							</p>
							<ul className="text-sm text-muted-foreground space-y-1 mt-2 list-disc list-inside">
								<li>Retry the connection</li>
								<li>Update your credentials</li>
								<li>Check Convex status page</li>
							</ul>
							<p className="text-sm text-muted-foreground mt-2">
								We run health checks every 6 hours to detect issues early.
							</p>
						</section>

						{/* Limitations */}
						<section className="space-y-2">
							<h3 className="font-semibold">Current limitations</h3>
							<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
								<li>Schema updates are deployed automatically by blah.chat</li>
								<li>File storage currently stays on blah.chat (migration planned)</li>
								<li>You must maintain an active connection for the app to work</li>
							</ul>
						</section>

						{/* Security */}
						<section className="space-y-2">
							<h3 className="font-semibold">Security</h3>
							<p className="text-sm text-muted-foreground">
								Your deploy key is encrypted with AES-256-GCM before storage and never
								logged. Only encrypted credentials are stored, and decryption happens
								server-side when needed for database operations.
							</p>
						</section>
					</div>
				</ScrollArea>

				<DialogFooter>
					<Button onClick={() => onOpenChange(false)}>Got it</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
