!macro customInstall
  CreateShortCut "$SENDTO\파일 포장마차로 포장.lnk" "$INSTDIR\FilePojangmacha.exe" "" "$INSTDIR\FilePojangmacha.exe" 0
!macroend
!macro customUnInstall
  Delete "$SENDTO\파일 포장마차로 포장.lnk"
!macroend
