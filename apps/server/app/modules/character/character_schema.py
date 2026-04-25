from pydantic import BaseModel, Field


class CharacterSummary(BaseModel):
    character_id: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터를 구분하는 고유 ID입니다.",
    )
    character_name: str = Field(
        min_length=1,
        max_length=50,
        description="화면에 보여줄 캐릭터 이름입니다.",
    )
    character_description: str = Field(
        min_length=1,
        max_length=200,
        description="캐릭터를 한 줄로 소개하는 짧은 설명입니다.",
    )
    character_gender: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터의 성별 또는 성별 표현입니다.",
    )
    character_age_range: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터의 나이대입니다.",
    )
    character_background: str = Field(
        min_length=1,
        max_length=500,
        description="캐릭터가 어떤 배경을 가진 인물인지 설명하는 내용입니다.",
    )
    character_personality: str = Field(
        min_length=1,
        max_length=300,
        description="캐릭터의 말투와 성격을 화면에 보여주기 위한 내용입니다.",
    )
    character_image_url: str = Field(
        min_length=1,
        max_length=300,
        description="캐릭터 이미지 파일을 가져올 수 있는 서버 상대 경로입니다.",
    )


class CharacterDetail(BaseModel):
    character_id: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터를 구분하는 고유 ID입니다.",
    )
    character_name: str = Field(
        min_length=1,
        max_length=50,
        description="화면에 보여줄 캐릭터 이름입니다.",
    )
    character_description: str = Field(
        min_length=1,
        max_length=200,
        description="캐릭터를 한 줄로 소개하는 짧은 설명입니다.",
    )
    character_gender: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터의 성별 또는 성별 표현입니다.",
    )
    character_age_range: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터의 나이대입니다.",
    )
    character_background: str = Field(
        min_length=1,
        max_length=500,
        description="캐릭터가 어떤 배경을 가진 인물인지 설명하는 내용입니다.",
    )
    character_personality: str = Field(
        min_length=1,
        max_length=300,
        description="캐릭터의 말투와 성격을 화면에 보여주기 위한 내용입니다.",
    )
    character_image_url: str = Field(
        min_length=1,
        max_length=300,
        description="캐릭터 이미지 파일을 가져올 수 있는 서버 상대 경로입니다.",
    )
    character_greeting: str = Field(
        min_length=1,
        max_length=300,
        description="새 대화에서 캐릭터가 먼저 보여줄 인사말입니다.",
    )


class CharacterProfile(BaseModel):
    character_id: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터를 구분하는 고유 ID입니다.",
    )
    character_name: str = Field(
        min_length=1,
        max_length=50,
        description="화면에 보여줄 캐릭터 이름입니다.",
    )
    character_description: str = Field(
        min_length=1,
        max_length=200,
        description="캐릭터를 한 줄로 소개하는 짧은 설명입니다.",
    )
    character_gender: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터의 성별 또는 성별 표현입니다.",
    )
    character_age_range: str = Field(
        min_length=1,
        max_length=50,
        description="캐릭터의 나이대입니다.",
    )
    character_background: str = Field(
        min_length=1,
        max_length=500,
        description="캐릭터가 어떤 배경을 가진 인물인지 설명하는 내용입니다.",
    )
    character_personality: str = Field(
        min_length=1,
        max_length=300,
        description="캐릭터의 말투와 성격을 화면에 보여주기 위한 내용입니다.",
    )
    character_image_url: str = Field(
        min_length=1,
        max_length=300,
        description="캐릭터 이미지 파일을 가져올 수 있는 서버 상대 경로입니다.",
    )
    character_greeting: str = Field(
        min_length=1,
        max_length=300,
        description="새 대화에서 캐릭터가 먼저 보여줄 인사말입니다.",
    )
    character_speaking_style: str = Field(
        min_length=1,
        max_length=500,
        description="AI 답변 품질을 높이기 위한 캐릭터 말투 지시문입니다.",
    )
    character_user_relationship: str = Field(
        min_length=1,
        max_length=500,
        description="AI 답변 품질을 높이기 위한 캐릭터와 사용자 사이의 관계 설정입니다.",
    )
    character_response_rule: str = Field(
        min_length=1,
        max_length=700,
        description="AI 답변 품질을 높이기 위한 캐릭터별 답변 방식입니다.",
    )
    character_prompt_summary: str = Field(
        min_length=1,
        max_length=700,
        description="AI 요청에 짧게 넣기 위한 압축 캐릭터 프롬프트입니다.",
    )
    character_prompt: str = Field(
        min_length=1,
        max_length=1000,
        description="AI가 캐릭터답게 답변하도록 서버 내부에서만 사용하는 역할 지시문입니다.",
    )
