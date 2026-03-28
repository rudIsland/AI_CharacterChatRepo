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
    return [
      "안녕하세요. 이번 Pull Request에서는 리뷰할 코드 변경 사항이 확인되지 않았습니다.",
      "",
      "## 코드 리뷰 요약",
      "",
      "### 주요 변경사항",
      "- 변경된 코드 diff가 없어 요약할 항목이 없습니다.",
      "",
      "### 전반적인 평가",
      "- 현재 기준으로는 리뷰 대상 변경이 없습니다.",
      "",
      "## 잠재적인 버그 및 성능 문제",
      "",
      "- 검토할 변경 코드가 없어 잠재적 문제를 판단할 근거가 부족합니다.",
      "",
      "## 개선 제안",
      "",
      "- 실제 코드 변경이 포함된 PR에서 다시 실행해 주세요.",
    ].join("\n");
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
- 인사말은 "안녕하세요."로 시작하고, 전체 총평을 2~4문장으로 먼저 작성하세요.

출력 형식:
- 반드시 아래 마크다운 섹션 제목과 순서를 그대로 지키세요.
- 섹션 제목 이름을 바꾸지 마세요.
- 근거 없는 칭찬이나 추상적인 감상은 쓰지 마세요.
- 코드 위치를 언급할 때는 가능한 한 파일 경로를 포함하세요.

안녕하세요. ...총평...

## 코드 리뷰 요약

### 주요 변경사항
- 핵심 변경사항을 3~5개 이내의 bullet로 정리하세요.

### 전반적인 평가
- 유지보수성, 구조, 확장성 관점에서 1~3개 bullet로 평가하세요.

## 잠재적인 버그 및 성능 문제

1. 제목 (심각도: 높음|중간|낮음)
- 문제:
- 근거:
- 제안:

2. 제목 (심각도: 높음|중간|낮음)
- 문제:
- 근거:
- 제안:

- 실제로 지적할 문제가 없으면 다음 한 줄만 작성하세요.
  - 현재 diff와 문맥 기준으로 우선 수정이 필요한 잠재적 문제는 발견하지 못했습니다.

## 개선 제안

- 바로 적용 가능한 개선안을 2~5개 bullet로 작성하세요.
- 이미 잠재적 문제 섹션에서 제안한 내용과 중복되더라도, 실행 우선순위가 보이도록 다시 정리하세요.
- 테스트 코드 제안은 여기서 다루지 마세요.

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
