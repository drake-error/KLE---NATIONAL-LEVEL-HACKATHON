import { mergeParts } from "./types";
import { commonPart } from "./parts/common";
import { featuresPart } from "./parts/features";
import { dashboardsPart } from "./parts/dashboards";
import { contentPart } from "./parts/content";
import { settingsPart } from "./parts/settings";

export const dictionary = mergeParts([
  commonPart,
  featuresPart,
  dashboardsPart,
  contentPart,
  settingsPart,
]);
