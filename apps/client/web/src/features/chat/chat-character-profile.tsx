import type { CharacterSummary } from "@/features/chat/chat-types";

type ChatCharacterProfileProps = {
  selectedCharacter: CharacterSummary | null;
  selectedCharacterImageUrl: string;
};

export function ChatCharacterProfile({
  selectedCharacter,
  selectedCharacterImageUrl,
}: ChatCharacterProfileProps) {
  if (!selectedCharacter || !selectedCharacterImageUrl) {
    return (
      <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-800/50 p-3">
        <p className="text-sm text-slate-400">캐릭터를 선택해 주세요.</p>
      </aside>
    );
  }

  return (
    <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-800/50 p-3">
      <div className="flex min-h-0 flex-col gap-3">
        <img
          src={selectedCharacterImageUrl}
          alt={`${selectedCharacter.character_name} 초상화`}
          className="aspect-square w-full max-h-[34vh] rounded-xl border border-slate-700 bg-slate-900 object-cover"
        />

        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            캐릭터
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {selectedCharacter.character_name}
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            {selectedCharacter.character_description}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {selectedCharacter.character_gender} ·{" "}
            {selectedCharacter.character_age_range}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-2.5">
          <p className="text-xs font-semibold text-slate-400">배경</p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            {selectedCharacter.character_background}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-2.5">
          <p className="text-xs font-semibold text-slate-400">성격</p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            {selectedCharacter.character_personality}
          </p>
        </div>
      </div>
    </aside>
  );
}
