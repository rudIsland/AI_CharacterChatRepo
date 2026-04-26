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
      <aside className="shrink-0 rounded-xl border border-slate-800 bg-slate-800/50 p-3 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl">
        <p className="text-sm text-slate-400">캐릭터를 선택해 주세요.</p>
      </aside>
    );
  }

  return (
    <aside className="shrink-0 rounded-xl border border-slate-800 bg-slate-800/50 p-3 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl">
      <div className="flex min-h-0 gap-3 lg:flex-col">
        <img
          src={selectedCharacterImageUrl}
          alt={`${selectedCharacter.character_name} portrait`}
          className="h-20 w-20 shrink-0 rounded-xl border border-slate-700 bg-slate-900 object-cover sm:h-24 sm:w-24 lg:aspect-square lg:h-auto lg:max-h-[30vh] lg:w-full"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-slate-500">
            캐릭터
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {selectedCharacter.character_name}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-300 lg:line-clamp-none">
            {selectedCharacter.character_description}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {selectedCharacter.character_gender} ·{" "}
            {selectedCharacter.character_age_range}
          </p>
        </div>

        <div className="hidden rounded-xl border border-slate-700 bg-slate-800 p-2.5 lg:block">
          <p className="text-xs font-semibold text-slate-400">배경</p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            {selectedCharacter.character_background}
          </p>
        </div>

        <div className="hidden rounded-xl border border-slate-700 bg-slate-800 p-2.5 lg:block">
          <p className="text-xs font-semibold text-slate-400">성격</p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            {selectedCharacter.character_personality}
          </p>
        </div>
      </div>
    </aside>
  );
}
