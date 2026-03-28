import { existsSync, readFileSync } from "fs";
import * as path from "path";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

interface TestGeneratorInput {
  workspacePath: string;
  changedFiles: string[];
  ragContext: string;
}

interface LanguageSettings {
  languageName: string;
  testingFramework: string;
  codeBlockLanguage: string;
}

const FILE_PREVIEW_LIMIT = 8_000;
const CONTEXT_PREVIEW_LIMIT = 16_000;

export async function generateTestSuggestions(
  testModel: BaseChatModel,
  input: TestGeneratorInput
): Promise<string> {
  if (input.changedFiles.length === 0) {
    return "테스트 제안을 만들 변경 파일이 없습니다.";
  }

  const testPrompt = ChatPromptTemplate.fromTemplate(`
당신은 테스트 코드 작성에 능숙한 시니어 엔지니어입니다.
대상 파일에 대해 실무적인 테스트 코드를 제안하세요.
응답은 반드시 한국어로 작성하세요.

작성 원칙:
- [Project Context]를 활용해 의존성, 협력 객체, 생성자, 설정 흐름을 해석하세요.
- 특정 생성자 존재 여부만 확인하려고 하지 말고, 유지보수에 도움이 되는 테스트 전략을 제안하세요.
- 특히 공개 동작, 경계 조건, 실패 케이스, 회귀 가능성이 높은 분기, 리팩토링 시 깨지기 쉬운 계약을 우선적으로 테스트하세요.
- 기존 프로젝트 문맥으로 충분히 추론 가능한 내용은 불필요하게 의심하지 마세요.
- 근거가 부족한 경우에는 최소한의 안전한 mock 또는 stub 전략을 제안하고 그 이유를 설명하세요.
- 테스트도 유지보수 대상이므로 이름, given-when-then 구조, 중복 최소화, 과도한 구현 결합을 신경 쓰세요.

출력 형식:
- 먼저 짧은 설명을 한국어로 작성하세요.
- 그 다음 하나의 코드 블록으로 테스트 코드를 제시하세요.
- 필요하면 마지막에 주의사항을 짧게 덧붙이세요.

[Project Context]
{ragContext}

[대상 파일]
경로: {filePath}
언어: {languageName}
테스트 프레임워크: {testingFramework}

\`\`\`{codeBlockLanguage}
{fileContent}
\`\`\`
  `);

  const testChain = testPrompt.pipe(testModel).pipe(new StringOutputParser());
  const suggestionSections: string[] = [];

  for (const changedFilePath of input.changedFiles) {
    const languageSettings = getLanguageSettings(changedFilePath);
    if (!languageSettings) {
      continue;
    }

    const absoluteFilePath = path.join(input.workspacePath, changedFilePath);
    if (!existsSync(absoluteFilePath)) {
      continue;
    }

    const fileContent = readFileSync(absoluteFilePath, "utf-8");
    if (!fileContent.trim()) {
      continue;
    }

    const suggestion = await testChain.invoke({
      filePath: changedFilePath,
      languageName: languageSettings.languageName,
      testingFramework: languageSettings.testingFramework,
      codeBlockLanguage: languageSettings.codeBlockLanguage,
      fileContent: fileContent.slice(0, FILE_PREVIEW_LIMIT),
      ragContext: input.ragContext.slice(0, CONTEXT_PREVIEW_LIMIT),
    });

    suggestionSections.push(`### ${changedFilePath}\n\n${suggestion}`);
  }

  if (suggestionSections.length === 0) {
    return "테스트 제안을 생성할 수 있는 지원 대상 파일이 없습니다.";
  }

  return suggestionSections.join("\n\n");
}

function getLanguageSettings(filePath: string): LanguageSettings | null {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
      return {
        languageName: "TypeScript/JavaScript",
        testingFramework: "Jest or Vitest",
        codeBlockLanguage: "typescript",
      };
    case ".py":
      return {
        languageName: "Python",
        testingFramework: "pytest",
        codeBlockLanguage: "python",
      };
    case ".java":
      return {
        languageName: "Java",
        testingFramework: "JUnit",
        codeBlockLanguage: "java",
      };
    case ".cs":
      return {
        languageName: "C#",
        testingFramework: "xUnit or NUnit",
        codeBlockLanguage: "csharp",
      };
    case ".dart":
      return {
        languageName: "Dart",
        testingFramework: "package:test",
        codeBlockLanguage: "dart",
      };
    default:
      return null;
  }
}
