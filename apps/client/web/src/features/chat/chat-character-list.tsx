import type { CharacterSummary } from "@/features/chat/chat-types";

type ChatCharacterListProps = {
  characterList: CharacterSummary[];
  selectedCharacterId: string;
  isLoadingCharacterList: boolean;
  buildCharacterImageUrl: (character: CharacterSummary) => string;
  onCharacterSelect: (characterId: string) => void;
};

export function ChatCharacterList({
  characterList,
  selectedCharacterId,
  isLoadingCharacterList,
  buildCharacterImageUrl,
  onCharacterSelect,
}: ChatCharacterListProps) {
  return (
    <section className="shrink-0 rounded-xl border border-slate-800 bg-slate-800/50 p-1.5 sm:rounded-2xl sm:p-2">
      {isLoadingCharacterList && (
        <p className="text-sm text-slate-400">
          캐릭터를 불러오는 중입니다...
        </p>
      )}

      {!isLoadingCharacterList && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:gap-2">
          {characterList.map((character) => {
            const isSelected = character.character_id === selectedCharacterId;

            return (
              <button
                key={character.character_id}
                type="button"
                className={`flex min-w-40 items-center gap-2 rounded-xl border p-2 text-left transition sm:min-w-48 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-950/30 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700"
                }`}
                onClick={() => onCharacterSelect(character.character_id)}
              >
                <img
                  src={buildCharacterImageUrl(character)}
                  alt={`${character.character_name} 초상화`}
                  className="h-9 w-9 shrink-0 rounded-lg border border-slate-700 bg-slate-900 object-cover sm:h-10 sm:w-10"
                />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {character.character_name}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-slate-400">
                    {character.character_description}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    {character.character_gender} · {character.character_age_range}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
