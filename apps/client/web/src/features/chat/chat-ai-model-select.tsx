import type { AiModelId, AiModelOption } from "@/features/chat/chat-types";

type ChatAiModelSelectProps = {
  aiModelOptionList: AiModelOption[];
  selectedAiModelId: AiModelId | "";
  isDisabled: boolean;
  onAiModelIdChange: (aiModelId: AiModelId) => void;
};

function AiModelIcon({ provider }: { provider?: string }) {
  if (provider === "gemini") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      </svg>
    );
  }

  if (provider === "local_ai") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
        <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
        <line x1="6" x2="6.01" y1="6" y2="6" />
        <line x1="6" x2="6.01" y1="18" y2="18" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

export function ChatAiModelSelect({
  aiModelOptionList,
  selectedAiModelId,
  isDisabled,
  onAiModelIdChange,
}: ChatAiModelSelectProps) {
  const selectedAiModelOption = aiModelOptionList.find((aiModelOption) => aiModelOption.ai_model_id === selectedAiModelId);

  return (
    <div
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 focus-within:ring-2 focus-within:ring-emerald-500"
      title="AI 모델 선택"
    >
      <span className="pointer-events-none absolute flex items-center justify-center">
        <AiModelIcon provider={selectedAiModelOption?.ai_model_provider} />
      </span>
      <select
        className="h-full w-full cursor-pointer appearance-none bg-transparent text-transparent outline-none [&>option]:text-slate-900"
        value={selectedAiModelId}
        onChange={(event) => onAiModelIdChange(event.target.value as AiModelId)}
        disabled={isDisabled}
      >
        {aiModelOptionList.map((aiModelOption) => (
          <option
            key={aiModelOption.ai_model_id}
            value={aiModelOption.ai_model_id}
          >
            {aiModelOption.ai_model_label}
          </option>
        ))}
      </select>
    </div>
  );
}
