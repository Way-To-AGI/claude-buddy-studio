import type {
  BackendKind,
  BackendResult,
  DetectedEnvironment,
  RestoreToken,
  SolverProgress,
  TargetBuddySpec,
} from "../core/types.js";

export interface ApplyBackendOptions {
  target: TargetBuddySpec;
  environment: DetectedEnvironment;
  silent?: boolean;
  installHook?: boolean;
  onProgress?: (progress: SolverProgress) => void;
}

export interface ApplyBackend {
  kind: BackendKind;
  apply(options: ApplyBackendOptions): Promise<BackendResult>;
  restore(environment: DetectedEnvironment, restoreToken?: RestoreToken): Promise<string[]>;
  rehatch(environment: DetectedEnvironment): Promise<string[]>;
}
