# 0.4.11 실제 드래그 재검증 / Native drag verification

2026-10-29 · 설치된 Windows x64 앱 0.4.11 · Windows 11 개발 PC 1대

## 결과 / Result

탐색기에서 사진 20장을 작은 붉은 포장마차로 끌어 넣고, 표지와 순서를 바꿔 PDF를 만든 뒤, 갈색 PDF 봉지를 새 빈 탐색기 폴더로 끌어 꺼냈습니다. 받은 파일을 한컴 한PDF 2022에서 열어 20쪽과 첫 페이지를 확인했습니다. 두 창 사이 드래그와 PDF 열기는 사용자가 직접 수행했고 표지·순서·포장 버튼은 Windows UI 도구로 조작했습니다. 파일 선택 모형이나 스크립트 복사로 대체하지 않았습니다.

20 photos were dropped from Explorer into the installed mini stall. After cover/order changes and real PDF creation, the brown bag was dragged into a newly created empty Explorer folder. The received document opened in Hancom HanPDF 2022 with 20 pages. A human performed both cross-window drags and opened the PDF; native Windows UI automation operated the cover/reorder/cook buttons. No picker stub or scripted copy substituted for these drags.

| 확인 항목 / Check | 결과 / Result |
| --- | --- |
| 실제 설치본 / Installed version | Executable metadata and in-app help: 0.4.11 |
| 입력 / Input | 20 JPGs with Korean names and spaces, mixed portrait/landscape |
| 설정 / Settings | A4, automatic orientation, 10 mm margins |
| 표지·순서 / Cover and order | 07 as cover, 06 before 05 |
| 새 폴더로 꺼내기 / Drag-out | Initially empty folder received `사진 한 봉지 (3).pdf` |
| 저장본과 받은 파일 / Saved vs received | Identical SHA-256; 4,740,323 bytes |
| 내용 / Contents | 20 pages; embedded images matched the expected sources in all 20 positions |
| 원본 / Originals | All 20 original SHA-256 values unchanged |
| 일반 뷰어 / External viewer | HanPDF opened the received file; page count 20 and cover 07 visible |

전체 페이지 순서 / Full page order: `7, 6, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 1, 2, 3, 4`.

Explorer supplied the initial order starting with 05; the app preserved it until the explicit cover/reorder changes. Users can also choose filename sorting.

Job: `7636f928-78de-4d29-9da4-1a3cb47f23fa`

Received PDF SHA-256: `84bc1c35b61e4dd9f5a278c72fe639d5918a74c3abe01360eea64282bbd74d09`

## 새 시연 영상 / New demo

`FilePojangmacha-0.4.11-native-drag-demo.mp4`: **24.0 seconds**, H.264, 1440×900, 30 fps, silent. This is a new recording of installed 0.4.11, not a relabeled 0.3.1 video. All clips come from the same job and continuous capture, at original speed. Waiting intervals were removed; captions, crops and opaque privacy masks were added. App actions and cursor movement were not synthesized.

새 영상은 0.4.11 설치 앱을 다시 촬영한 24초 영상입니다. 같은 작업의 실제 촬영에서 대기를 자르고 자막과 개인정보 가림만 적용했습니다. 입력·출력 드래그와 일반 뷰어의 결과가 포함됩니다. 배속, 가짜 커서, 합성 앱 화면이 없습니다.

The supplement ZIP contains the page/order/hash report, original test postcards, received PDF, viewer/version screenshots, edit manifest, and verification/edit scripts. The full desktop recording and private app profile are not published. Existing installer/source assets remain unchanged; earlier 0.3.1 video and initial-build documents remain historical records.

## 범위 / Limits

This adds native drag/viewer evidence to the original 0.4.11 build validation. It does not repeat or expand the earlier 50 automated checks, nor establish compatibility on a second PC. The app remains an **unsigned free beta**, with manual updates. Windows 10, ARM64, varied scaling and other storage types remain unverified. No app code or installer changes were needed for this recording.
