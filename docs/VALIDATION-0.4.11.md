# 0.4.11 무료 베타 검증 / Beta validation

2026-10-29 · Windows 11 x64 (build 26200) · Electron 45.0.0

0.3.1의 복원된 디자인과 파일 처리 기능을 유지하고, 앱 내부 버전을 0.4.11로 바꿔 프런트엔드와 Windows 설치 파일을 새로 빌드했습니다. 과거 설치 파일의 이름만 바꾼 것이 아닙니다. 2026-10-28에 소스 재빌드한 이미지 라이브러리 바이너리 3개를 그대로 사용했고 각 해시를 재검증했습니다.

This is a newly built app and installer with internal version 0.4.11, retaining the restored design and features of 0.3.1. It is not a renamed old installer. The three source-rebuilt native binaries from 2026-10-28 were reused with verified hashes.

## 이번 빌드에서 확인한 것 / Checked in this build

| 범위 / Scope | 결과 / Result |
| --- | --- |
| Core conversion and local settings tests | 18/18 passed |
| Electron UI/main/worker flows and restart | 23/23 passed; native picker stubbed |
| Packaged engine and codecs | 9/9 passed |
| Installed engine and codecs | The same 9 checks repeated after reinstall; all passed |
| Version/source integrity | Installed and packaged app source/UI match the build; internal version 0.4.11 |
| Native binaries | All 3 SHA-256 values match the rebuild manifest |
| Upgrade 0.3.1 → 0.4.11 | Installer exit 0; stored orders and history preserved byte-for-byte |
| Uninstall → reinstall 0.4.11 | Both exit 0; executable, uninstall registration and Explorer Send to removed/restored |
| Data preservation | Stored orders/history and 4 existing result files preserved |
| Native launch | Actual installed mini stall, expanded counter, saved order, recent count and help version 0.4.11 observed |

50개의 서로 다른 자동 검사와 설치본에서 반복한 엔진 검사 9회입니다. 59개의 서로 다른 기능을 검증했다는 뜻은 아닙니다. 설치·제거는 NSIS 무인 실행으로 확인했으며 마법사 버튼 조작 검증은 아닙니다. 새 앱의 실제 실행 화면을 별도로 확인했습니다.

50 distinct automated checks, plus 9 repeated checks against the installed engine. This is not 59 distinct features. Installation/uninstallation used NSIS silent switches; installer wizard buttons were not exercised. The actual installed application was launched separately.

검사에는 한글·공백·긴 이름, EXIF 방향, 투명 이미지, 사진 PDF와 실제 진행률, PDF 페이지 순서·분리, 이미지 비율·코덱, 이름 충돌, 취소 후 정리·재시도, 손상 입력·잘못된 저장 위치, 원본 보존, 빠른 주문·최근 기록·재시작이 포함됩니다.

Coverage includes Korean/spaced/long filenames, EXIF orientation, transparency, photo PDF and actual progress, PDF page order/splitting, image aspect ratio/codecs, naming conflicts, cancellation cleanup/retry, corrupt input, invalid destinations, original preservation, quick orders, history and restart persistence.

## 실제 드래그 영상 / Native drag video

**0.4.11 설치 앱에서 다시 검증하고 24초 영상으로 촬영했습니다.** 탐색기 사진 20장 입력 → 표지·순서 변경 → PDF 생성 → 새 빈 폴더로 봉지 끌어내기 → 한PDF 열기입니다. 받은 PDF는 저장본과 SHA-256이 같고, 20쪽 모두 지정한 순서이며 원본 20장의 해시도 유지됐습니다. [상세 기록](VALIDATION-0.4.11-NATIVE.md).

**Newly verified and filmed in installed 0.4.11.** Human Explorer drop-in and bag drag-out, actual PDF processing and opening the received file in HanPDF. Saved/received hashes, all 20 page positions and unchanged originals were verified. The new video is 24.0 seconds from one job. The old 0.3.1 video remains as historical evidence.

## 남은 한계 / Remaining limits

- 별도 물리 PC에서 설치·실행을 검증하지 않았습니다. / No second physical PC validation.
- Windows 10, ARM64, 다양한 배율, FAT/exFAT·네트워크 저장소는 미검증입니다. / Those platforms and storage/display configurations remain unverified.
- 코드 서명·자동 업데이트가 없습니다. / No code signing or auto-updates.
- 이미지 라이브러리 재빌드와 Electron/Chromium 전체 재빌드는 다릅니다. 후자는 수행하지 않았습니다. / Electron/Chromium and compiler tools were not built from source.
- 기술 검증은 이용자의 반복 사용 가치나 시장 반응을 입증하지 않습니다. / Technical validation does not establish retention or demand.

릴리스의 `validation-evidence-0411.zip`에는 개인 경로를 제거한 결과 JSON과 검사 로그를 포함합니다. 원본 데스크톱 녹화와 사용자 프로필은 공개하지 않습니다.
