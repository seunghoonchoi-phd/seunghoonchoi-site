# 백업 & 복구

해킹·실수에 대비한 2중 백업.

## 1) 기본 방어 — git 히스토리 (이미 작동 중, 설정 0)
이 저장소의 **모든 커밋이 영구 보존**된다. `/admin/`에서 누가 글을 망가뜨리거나 지워도
그건 "새 커밋"일 뿐, 과거 버전은 그대로 남아 **언제든 되돌릴 수 있다.**

- admin/Worker가 쓰는 GitHub 토큰은 권한이 **Contents(Read and write)뿐**이어야 한다.
  그러면 히스토리를 다시 쓰거나, 저장소를 지우거나, 백업 워크플로를 끄지 **못한다.**
  → 토큰 만들 때 **Workflows·Administration 권한은 주지 말 것.**
- 되돌리기: 저장소 → 해당 파일의 **History** 에서 이전 버전 보기 →
  또는 망가진 커밋에서 `Revert`. (GitHub 웹에서 클릭으로 가능)

## 2) 독립 백업 — 별도 비공개 저장소로 자동 스냅샷 (`.github/workflows/backup.yml`)
**발행할 때마다**(= main 에 push, /admin/ 편집 포함) 소스를 **다른 비공개 저장소**로
타임스탬프 커밋으로 복사한다. 메인 저장소가 통째로 손상돼도 백업 저장소에 **버전별로** 남는다.
admin 토큰으로는 이 백업 저장소를 건드릴 수 없다(다른 토큰을 Actions Secret으로 둠).

### 켜는 법 (1회)
1. **빈 비공개 저장소 만들기**: github.com/new → 이름 `seunghoonchoi-site-backup` → **Private** → Create (파일 추가 X).
2. **백업용 토큰**: GitHub → Settings → Developer settings → **Fine-grained tokens** →
   Repository access = `seunghoonchoi-phd/seunghoonchoi-site-backup` 만 →
   Permissions의 **Contents = Read and write** → 생성·복사.
3. **Secret 등록**: 이 저장소(`seunghoonchoi-site`) → **Settings → Secrets and variables → Actions →
   New repository secret** → 이름 `BACKUP_TOKEN`, 값 = 위 토큰 → 저장.

이걸로 끝. 다음 발행부터 `seunghoonchoi-site-backup` 에 스냅샷이 쌓인다.
(설정 전까지 워크플로는 자동으로 건너뛰므로 지금 그대로 둬도 무해.)

> 참고: 백업에는 `.github/`(워크플로)는 제외된다 — 백업 토큰을 Contents 권한만으로 최소화하기 위함.
> 콘텐츠·레이아웃·CSS·이미지 등 복구에 필요한 것은 모두 포함된다.

### 복구하는 법
- **일부 글만**: 백업 저장소에서 해당 `.md` 내용을 복사해 `/admin/` 또는 메인 저장소에 붙여넣기.
- **통째로**: 백업 저장소를 clone → 메인 저장소로 내용 복사 → push. 사이트가 자동 재배포.
- 백업 저장소 자체도 커밋 히스토리가 있어 **특정 시점**으로 되돌릴 수 있다.

## (선택) 로컬 사본
승훈님 PC의 `G:\내 드라이브\seunghoonchoi-site\` 도 사본이다(구글 드라이브가 버전 보관).
단 `/admin/` 편집은 로컬에 자동 반영되지 않으니, 최신화하려면 가끔 `git pull` 하면 된다.
