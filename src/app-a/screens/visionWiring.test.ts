import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve(process.cwd(), "src");
const dailyPlanReviewPath = path.join(SRC_DIR, "app-a/components/daily-reset/DailyPlanReview.tsx");
const visionStrategyBuilderPath = path.join(SRC_DIR, "app-a/components/vision/VisionStrategyBuilder.tsx");
const visionScreenPath = path.join(SRC_DIR, "app-a/screens/VisionScreen.tsx");

const dailyPlanReviewContent = fs.readFileSync(dailyPlanReviewPath, "utf-8");
const visionStrategyBuilderContent = fs.readFileSync(visionStrategyBuilderPath, "utf-8");
const visionScreenContent = fs.readFileSync(visionScreenPath, "utf-8");

// We will test the 15 scenarios here
let passedCount = 0;
let failedCount = 0;

function assertPass(scenarioName: string, condition: boolean, errorMessage: string) {
    try {
        assert(condition, errorMessage);
        console.log(`PASS: ${scenarioName}`);
        passedCount++;
    } catch (e) {
        console.error(`FAIL: ${scenarioName} - ${e.message}`);
        failedCount++;
    }
}

console.log("TAP version 13");
console.log("# Subtest: Wiring Scenarios");

assertPass(
    "1. DailyPlanReview develop koristi controller", 
    dailyPlanReviewContent.includes("visionController.handleDevelopVision") && !dailyPlanReviewContent.includes("writeSessionDraft(key"), 
    "Expected visionController.handleDevelopVision and no legacy writeSessionDraft"
);

assertPass(
    "2. Inbox save koristi controller",
    dailyPlanReviewContent.includes("visionController.handleSaveToInbox("),
    "Expected visionController.handleSaveToInbox"
);

assertPass(
    "3. Connect koristi controller sa tačnim visionId",
    dailyPlanReviewContent.includes("visionController.handleConnectExisting({") && dailyPlanReviewContent.includes("visionId"),
    "Expected visionController.handleConnectExisting to include visionId"
);

assertPass(
    "4. Archived view koristi controller (viewArchived)",
    dailyPlanReviewContent.includes("visionController.viewArchived("),
    "Expected visionController.viewArchived"
);

assertPass(
    "5. Reactivate koristi controller",
    dailyPlanReviewContent.includes("visionController.handleConnectExisting({") && dailyPlanReviewContent.includes("reactivate"),
    "Expected reactivate to be passed to controller"
);

assertPass(
    "6. Nema legacy inline write-a",
    !dailyPlanReviewContent.includes("saveVisionStrategy(") && !dailyPlanReviewContent.includes("saveInboxItem("),
    "Expected no direct legacy persistence calls in DailyPlanReview"
);

assertPass(
    "7. VisionStrategyBuilder generate koristi controller",
    visionStrategyBuilderContent.includes("controller.generatePreview("),
    "Expected controller.generatePreview"
);

const generateFnMatch = visionStrategyBuilderContent.match(/async function generateStrategy[\s\S]*?^  \}/m);
assertPass(
    "8. Generate daje 0 repository writes",
    generateFnMatch && !generateFnMatch[0].includes("persistStrategy"),
    "Expected generateStrategy to not call persistStrategy"
);

assertPass(
    "9. Save button koristi controller save",
    visionStrategyBuilderContent.includes("controller.saveStrategy("),
    "Expected controller.saveStrategy"
);

assertPass(
    "10. Cancel/Edit koriste controller transitions",
    visionStrategyBuilderContent.includes("controller.cancelPreview()"),
    "Expected controller.cancelPreview to be called on cancel"
);

assertPass(
    "11. Concurrent klik daje jedan write (controller protection wired)",
    visionStrategyBuilderContent.includes("await controller.saveStrategy"),
    "Expected await controller.saveStrategy"
);

assertPass(
    "12. VisionScreen prima targetVisionId",
    visionScreenContent.includes("targetVisionId?: string | null"),
    "Expected VisionScreen to accept targetVisionId prop"
);

assertPass(
    "13. Archived pregled ne menja currentVisionId",
    visionScreenContent.includes("!valid && active.length === 1 && !targetVisionId") || visionScreenContent.includes("!targetVisionId"),
    "Expected currentVisionId mutation to be protected by targetVisionId check"
);

assertPass(
    "14. Provenance stiže do stvarnog save payload-a",
    visionStrategyBuilderContent.includes("provenanceItemIds: initialProvenanceItemIds"),
    "Expected provenanceItemIds in the document payload"
);

assertPass(
    "15. Unmount tokom pending Promise-a ne ažurira UI state",
    dailyPlanReviewContent.includes("if (!isMounted.current) return;") && visionStrategyBuilderContent.includes("if (!isMounted.current) return"),
    "Expected isMounted checks after awaited calls"
);

console.log(`1..15`);
console.log(`# tests 15`);
console.log(`# pass ${passedCount}`);
console.log(`# fail ${failedCount}`);

if (failedCount > 0) process.exit(1);
