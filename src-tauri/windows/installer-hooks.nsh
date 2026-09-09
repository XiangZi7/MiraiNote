!include nsDialogs.nsh
!include LogicLib.nsh

; The hook is included before Tauri declares its first (welcome) page.
!define MUI_WELCOMEPAGE_TEXT "$(MiraiWelcomeText)"
!define MUI_PAGE_CUSTOMFUNCTION_SHOW MiraiAssociationShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE MiraiAssociationLeave
VIAddVersionKey "CompanyName" "XiangZi7"

LangString MiraiWelcomeText 2052 "安装 MiraiNote 文档工作台。$\r$\n$\r$\n点击“下一步”继续安装。"
LangString MiraiWelcomeText 1033 "Install the MiraiNote document workspace.$\r$\n$\r$\nClick Next to continue."
LangString MiraiAssociateText 2052 "用 MiraiNote 默认打开 .md 文档"
LangString MiraiAssociateText 1033 "Use MiraiNote to open .md files by default"
LangString MiraiAssociateHint 2052 "安装后将打开 Windows 默认应用设置，请选择 MiraiNote 并确认。"
LangString MiraiAssociateHint 1033 "After installation, select MiraiNote in Windows Default Apps to confirm."

Var MiraiAssociateCheckbox
Var MiraiAssociateMd

Function MiraiAssociationShow
  ${NSD_CreateCheckbox} 120u 134u 195u 22u "$(MiraiAssociateText)"
  Pop $MiraiAssociateCheckbox
  SetCtlColors $MiraiAssociateCheckbox "${MUI_TEXTCOLOR}" "${MUI_BGCOLOR}"
  ${If} $MiraiAssociateMd == ""
    StrCpy $MiraiAssociateMd ${BST_CHECKED}
  ${EndIf}
  ${NSD_SetState} $MiraiAssociateCheckbox $MiraiAssociateMd
  ${NSD_CreateLabel} 120u 160u 195u 30u "$(MiraiAssociateHint)"
  Pop $0
  SetCtlColors $0 "${MUI_TEXTCOLOR}" "${MUI_BGCOLOR}"
FunctionEnd

Function MiraiAssociationLeave
  ${NSD_GetState} $MiraiAssociateCheckbox $MiraiAssociateMd
FunctionEnd

!macro NSIS_HOOK_POSTINSTALL
  ; Silent updates preserve the previous opt-in and never open system settings.
  ${If} $MiraiAssociateMd == ""
    ReadRegDWORD $MiraiAssociateMd HKCU "Software\XiangZi7\MiraiNote" "AssociateMarkdown"
  ${EndIf}
  ${If} $MiraiAssociateMd == ${BST_CHECKED}
    WriteRegDWORD HKCU "Software\XiangZi7\MiraiNote" "AssociateMarkdown" 1
    WriteRegStr HKCU "Software\Classes\MiraiNote.Markdown" "" "Markdown document"
    WriteRegStr HKCU "Software\Classes\MiraiNote.Markdown\DefaultIcon" "" '$\"$INSTDIR\mirainote.exe$\",0'
    WriteRegStr HKCU "Software\Classes\MiraiNote.Markdown\shell\open\command" "" '$\"$INSTDIR\mirainote.exe$\" $\"%1$\"'
    WriteRegBin HKCU "Software\Classes\.md\OpenWithProgids" "MiraiNote.Markdown" ""
    WriteRegStr HKCU "Software\XiangZi7\MiraiNote\Capabilities" "ApplicationName" "MiraiNote"
    WriteRegStr HKCU "Software\XiangZi7\MiraiNote\Capabilities" "ApplicationDescription" "MiraiNote Markdown document workspace"
    WriteRegStr HKCU "Software\XiangZi7\MiraiNote\Capabilities" "ApplicationIcon" '$\"$INSTDIR\mirainote.exe$\",0'
    WriteRegStr HKCU "Software\XiangZi7\MiraiNote\Capabilities\FileAssociations" ".md" "MiraiNote.Markdown"
    WriteRegStr HKCU "Software\RegisteredApplications" "MiraiNote" "Software\XiangZi7\MiraiNote\Capabilities"
    !insertmacro UPDATEFILEASSOC
    ; Windows owns UserChoice. Never write its ProgId/hash or overwrite another default.
    ${IfNot} ${Silent}
    ${AndIf} $PassiveMode != 1
      ExecShell "open" "ms-settings:defaultapps?registeredAppUser=MiraiNote"
    ${EndIf}
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Remove only registrations still pointing at this installation.
  ReadRegStr $0 HKCU "Software\Classes\MiraiNote.Markdown\shell\open\command" ""
  ${If} $0 == '$\"$INSTDIR\mirainote.exe$\" $\"%1$\"'
    DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "MiraiNote.Markdown"
    DeleteRegKey /ifempty HKCU "Software\Classes\.md\OpenWithProgids"
    DeleteRegKey /ifempty HKCU "Software\Classes\.md"
    DeleteRegKey HKCU "Software\Classes\MiraiNote.Markdown"
    DeleteRegValue HKCU "Software\RegisteredApplications" "MiraiNote"
    DeleteRegKey HKCU "Software\XiangZi7\MiraiNote\Capabilities"
    DeleteRegValue HKCU "Software\XiangZi7\MiraiNote" "AssociateMarkdown"
    DeleteRegKey /ifempty HKCU "Software\XiangZi7\MiraiNote"
    !insertmacro UPDATEFILEASSOC
  ${EndIf}
!macroend
