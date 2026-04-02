import type { BackendKind, DetectedEnvironment } from "../core/types.js";
import { binarySaltPatchBackend } from "./binary-salt-patch.js";
import { configUserIdBackend } from "./config-userid.js";
import type { ApplyBackend } from "./types.js";

const backendRegistry: Record<BackendKind, ApplyBackend> = {
  "config-userid": configUserIdBackend,
  "binary-salt-patch": binarySaltPatchBackend,
};

export function getBackend(kind: BackendKind): ApplyBackend {
  return backendRegistry[kind];
}

export function resolvePreferredBackend(
  environment: DetectedEnvironment,
  requested?: BackendKind,
): ApplyBackend {
  if (requested) {
    if (!environment.availableBackends.includes(requested)) {
      throw new Error(`Requested backend ${requested} is not available in this environment.`);
    }
    return getBackend(requested);
  }
  if (environment.availableBackends.includes("config-userid")) {
    return configUserIdBackend;
  }
  if (environment.availableBackends.includes("binary-salt-patch")) {
    return binarySaltPatchBackend;
  }
  throw new Error("No viable backend detected for this Claude installation.");
}
