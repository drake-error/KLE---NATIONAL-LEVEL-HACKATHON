import { mergeParts } from "./types";
import { commonPart } from "./parts/common";
import { featuresPart } from "./parts/features";
import { dashboardsPart } from "./parts/dashboards";
import { contentPart } from "./parts/content";
import { settingsPart } from "./parts/settings";
import { healthVaultPart } from "./parts/healthVaultPart";
import { patientFlowPart } from "./parts/patientFlowPart";
import { fleetStatusPart } from "./parts/fleetStatusPart";
import { parentalPart } from "./parts/parentalPart";
import { settingsPart as settingsExpandedPart } from "./parts/settingsPart";

export const dictionary = mergeParts([
  commonPart,
  featuresPart,
  dashboardsPart,
  contentPart,
  settingsPart,
  healthVaultPart,
  patientFlowPart,
  fleetStatusPart,
  parentalPart,
  settingsExpandedPart,
]);
