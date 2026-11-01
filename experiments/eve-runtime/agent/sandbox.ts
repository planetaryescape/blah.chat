import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

// No Docker, network, or native execution required for the lifecycle trial.
// This is not evidence of VM isolation or native code-execution suitability.
export const environment = JustBashSandbox.environment({ autoInstall: false });
export default defineSandbox(() => environment.open());
