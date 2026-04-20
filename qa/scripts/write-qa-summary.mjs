import fs from "node:fs";

function getStatusLabel(outcome) {
  if (outcome === "success") {
    return "통과";
  }

  if (outcome === "failure") {
    return "실패";
  }

  if (outcome === "skipped") {
    return "건너뜀";
  }

  return "미실행";
}

function getOverallStatus(outcomeList) {
  if (outcomeList.includes("failure")) {
    return "실패";
  }

  if (outcomeList.every((outcome) => outcome === "success")) {
    return "통과";
  }

  if (outcomeList.some((outcome) => outcome === "cancelled")) {
    return "중단";
  }

  return "부분 확인";
}

const lintOutcome = process.env.QA_LINT_OUTCOME ?? "";
const typecheckOutcome = process.env.QA_TYPECHECK_OUTCOME ?? "";
const unitOutcome = process.env.QA_UNIT_OUTCOME ?? "";
const regressionOutcome = process.env.QA_REGRESSION_OUTCOME ?? "";

const summaryLines = [
  "## QA 검사 요약",
  "",
  `- 전체 결과: **${getOverallStatus([lintOutcome, typecheckOutcome, unitOutcome, regressionOutcome])}**`,
  "- 수행한 검사:",
  `  - lint: 공유 패키지, web, mobile 소스 코드 검사 (${getStatusLabel(lintOutcome)})`,
  `  - typecheck: web 타입 검사, mobile 타입 검사, server compile check (${getStatusLabel(typecheckOutcome)})`,
  `  - test:unit: character data, chat store 단위 테스트 (${getStatusLabel(unitOutcome)})`,
  `  - test:regression: character list, chat session, chat history 회귀 테스트 (${getStatusLabel(regressionOutcome)})`,
  "",
  "실패한 항목이 있으면 해당 step 로그를 먼저 확인하세요.",
];

const summaryText = `${summaryLines.join("\n")}\n`;
const summaryOutputPath = process.env.QA_SUMMARY_FILE;
const githubStepSummaryPath = process.env.GITHUB_STEP_SUMMARY;

if (summaryOutputPath) {
  fs.writeFileSync(summaryOutputPath, summaryText, "utf8");
}

if (githubStepSummaryPath) {
  fs.appendFileSync(githubStepSummaryPath, summaryText, "utf8");
}

process.stdout.write(summaryText);
