from dataclasses import dataclass


@dataclass(frozen=True)
class CharacterPromptProfile:
    # AI 답변에서 사용할 캐릭터 이름입니다.
    character_name: str
    # 캐릭터를 짧게 설명하는 소개 문장입니다.
    character_description: str
    # 캐릭터의 성별 또는 성별 표현입니다.
    character_gender: str
    # 캐릭터의 나이대입니다.
    character_age_range: str
    # 캐릭터가 어떤 배경을 가진 인물인지 알려주는 내용입니다.
    character_background: str
    # 캐릭터의 성격과 대화 태도를 알려주는 내용입니다.
    character_personality: str
    # 캐릭터가 어떤 말투로 말해야 하는지 알려주는 내용입니다.
    character_speaking_style: str
    # 캐릭터가 사용자를 어떤 관계로 대해야 하는지 알려주는 내용입니다.
    character_user_relationship: str
    # 캐릭터가 답변을 어떤 방식으로 구성해야 하는지 알려주는 내용입니다.
    character_response_rule: str
    # AI 요청에 짧게 넣기 위한 압축 캐릭터 프롬프트입니다.
    character_prompt_summary: str
    # 캐릭터 말투와 역할을 더 구체적으로 지시하는 프롬프트입니다.
    character_prompt: str


@dataclass(frozen=True)
class ChatHistoryTurn:
    # 대화 한 줄의 작성자입니다. AI 요청에서는 user 또는 assistant로 보냅니다.
    role: str
    # 작성자가 실제로 보낸 메시지 내용입니다.
    message_text: str
