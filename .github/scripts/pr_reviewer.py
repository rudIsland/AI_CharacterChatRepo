import os
import requests
import google.generativeai as genai

# 1. GitHub Actions 워크플로우에서 전달한 환경 변수들을 불러옵니다.
repo = os.environ.get("GITHUB_REPOSITORY")  # GitHub Actions 기본 환경변수 활용
pr_number = os.environ.get("PR_NUMBER")
github_token = os.environ.get("GITHUB_TOKEN")
gemini_api_key = os.environ.get("GEMINI_API_KEY")

# 2. 이전 단계에서 GitHub CLI로 추출한 Diff(코드 변경 사항) 파일을 읽어옵니다.
try:
    with open("pr_diff.txt", "r", encoding="utf-8") as f:
        diff_content = f.read()
except FileNotFoundError:
    print("Diff 파일을 찾을 수 없습니다.")
    exit(1)

# 코드가 변경되지 않은 빈 PR일 경우 불필요한 API 호출을 방지합니다.
if not diff_content.strip():
    print("변경 사항이 없어 리뷰를 건너뜁니다.")
    exit(0)

# 3. Gemini API 환경 설정 및 AI 모델 초기화
genai.configure(api_key=gemini_api_key)
model = genai.GenerativeModel('gemini-1.5-pro')

# 4. 분리된 txt 파일에서 프롬프트 템플릿을 읽어옵니다.
prompt_path = os.path.join(os.path.dirname(__file__), "pr_reviewer_prompt.txt")
try:
    with open(prompt_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()
except FileNotFoundError:
    print("pr_reviewer_prompt.txt 파일을 찾을 수 없습니다.")
    exit(1)

prompt = prompt_template.replace("{diff_content}", diff_content)

# 5. Gemini API를 호출하여 코드 리뷰 결과를 생성합니다.
response = model.generate_content(prompt)
review_comment = response.text

# 6. GitHub API를 사용하여 PR에 리뷰 코멘트를 등록합니다.
url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
headers = {
    "Authorization": f"Bearer {github_token}",
    "Accept": "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28"
}
data = {"body": review_comment}

res = requests.post(url, headers=headers, json=data)
if res.status_code == 201:
    print("PR 리뷰가 성공적으로 등록되었습니다.")
else:
    print(f"리뷰 등록 실패: {res.status_code} - {res.text}")
    exit(1)