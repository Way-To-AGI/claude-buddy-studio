import { confirm, input, select } from "@inquirer/prompts";

import { EYES, HATS, RARITIES, SPECIES, STAT_NAMES } from "../core/constants.js";
import { normalizeTargetBuddySpec } from "../core/spec.js";
import type { DetectedEnvironment, TargetBuddySpec } from "../core/types.js";

export async function collectTargetSpec(
  environment: DetectedEnvironment,
  seed: Partial<TargetBuddySpec>,
): Promise<TargetBuddySpec> {
  const species =
    seed.species ??
    (await select({
      message: "选择物种",
      choices: SPECIES.map((value) => ({ value, name: value })),
    }));
  const rarity =
    seed.rarity ??
    (await select({
      message: "选择稀有度",
      choices: RARITIES.map((value) => ({ value, name: value })),
    }));
  const eye =
    seed.eye ??
    (await select({
      message: "选择眼睛样式",
      choices: EYES.map((value) => ({ value, name: value })),
    }));
  const hat =
    rarity === "common"
      ? "none"
      : seed.hat ??
        ((await select({
          message: "选择帽子",
          choices: [
            { value: "", name: "不指定（任意）" },
            ...HATS.filter((value) => value !== "none").map((value) => ({
              value,
              name: value,
            })),
          ],
        })) || undefined);
  const shiny =
    seed.shiny ??
    (await confirm({
      message: "是否要求闪光？",
      default: false,
    }));
  const peak =
    seed.peak ??
    ((await select({
      message: "指定最高属性",
      choices: [
        { value: "", name: "不指定" },
        ...STAT_NAMES.map((value) => ({ value, name: value })),
      ],
    })) || undefined);
  const dump =
    seed.dump ??
    ((await select({
      message: "指定最低属性",
      choices: [
        { value: "", name: "不指定" },
        ...STAT_NAMES.map((value) => ({ value, name: value })),
      ],
    })) || undefined);
  const name =
    seed.name ??
    ((await input({
      message: "自定义名字（可选）",
      default: "",
    })) || undefined);
  const personality =
    seed.personality ??
    ((await input({
      message: "自定义性格文案（可选）",
      default: "",
    })) || undefined);

  return normalizeTargetBuddySpec({
    species,
    rarity,
    eye,
    hat,
    shiny,
    peak,
    dump,
    name,
    personality,
  });
}

export async function confirmApply(environment: DetectedEnvironment): Promise<boolean> {
  return confirm({
    message: `使用 ${environment.availableBackends.join(", ")} 应用改动？`,
    default: true,
  });
}
