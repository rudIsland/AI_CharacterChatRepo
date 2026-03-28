import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

interface CodeReviewInput {
  prDiff: string;
  changedFiles: string[];
  ragContext: string;
}

const DIFF_PREVIEW_LIMIT = 16_000;
const CONTEXT_PREVIEW_LIMIT = 20_000;

export async function generateCodeReviewComment(
  reviewModel: BaseChatModel,
  input: CodeReviewInput
): Promise<string> {
  if (!input.prDiff.trim()) {
    return "이 Pull Request에는 리뷰할 코드 변경 사항이 없습니다.";
  }

  const reviewPrompt = ChatPromptTemplate.fromTemplate(`
당신은 시니어 코드 리뷰어입니다.
RAG로 수집한 프로젝트 문맥을 참고하여 Pull Request를 리뷰하세요.
응답은 반드시 한국어로 작성하세요.

리뷰 원칙:
- [PR Diff]와 [Project Context]에 있는 근거만 바탕으로 판단하세요.
- 특정 생성자나 메서드의 존재 여부만 집요하게 묻지 마세요. 프로젝트 전체 유지보수성 관점에서 리뷰하세요.
- 특히 네이밍의 직관성, 책임 분리, 모듈 경계, 중복 로직, 숨은 사이드 이펙트, 확장성, 테스트 용이성, 예외 처리, 설정 분리를 중점적으로 보세요.
- 문맥에 이미 있는 정보는 다시 존재 여부를 의심하지 마세요.
- 근거가 부족하면 추측하지 말고 "근거 부족"이라고 명시하세요.
- 사소한 취향 차이보다 실제 유지보수 비용 증가나 회귀 위험이 있는 문제를 우선하세요.

 출력 형식:
 1. 주요 발견사항
각 항목은 \`심각도: 높음|중간|낮음\`으로 시작하고, 왜 유지보수에 불리한지 짧고 명확하게 설명하세요.
 2. 개선 제안
바로 수정 가능한 수준으로 구체적으로 작성하세요.

[변경 파일]
{changedFiles}

[프로젝트 문맥]
{ragContext}

[PR Diff]
{prDiff}
  `);

  const reviewChain = reviewPrompt.pipe(reviewModel).pipe(new StringOutputParser());

  return reviewChain.invoke({
    changedFiles: input.changedFiles.join("\n"),
    ragContext: input.ragContext.slice(0, CONTEXT_PREVIEW_LIMIT),
    prDiff: input.prDiff.slice(0, DIFF_PREVIEW_LIMIT),
  });
}
