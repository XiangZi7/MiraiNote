use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, Window, WindowEvent, Wry,
};

struct DesktopState {
    ready: AtomicBool,
    quit_item: MenuItem<Wry>,
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window
            .show()
            .and_then(|_| window.unminimize())
            .and_then(|_| window.set_focus())
        {
            eprintln!("Could not restore MiraiNote: {error}");
        }
    }
}

pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "打开", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    // Enable quit only after the frontend can flush pending workspace changes.
    let quit_item = MenuItem::with_id(app, "quit", "退出", false, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &separator, &quit_item])?;
    let icon = app
        .default_window_icon()
        .ok_or("Missing application icon")?
        .clone();
    TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .tooltip(format!("MiraiNote {}", app.package_info().version))
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(error) = window.emit("desktop:quit-requested", ()) {
                        eprintln!("Could not request workspace save: {error}");
                        show_main_window(app);
                    }
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } | TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                }
            ) {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;
    app.manage(DesktopState {
        ready: AtomicBool::new(false),
        quit_item,
    });
    Ok(())
}

pub fn on_window_event(window: &Window, event: &WindowEvent) {
    if window.label() != "main" {
        return;
    }
    if let WindowEvent::CloseRequested { api, .. } = event {
        let ready = window
            .try_state::<DesktopState>()
            .is_some_and(|state| state.ready.load(Ordering::Acquire));
        // Without a functioning tray/frontend, preserve the normal close behavior.
        if ready && window.hide().is_ok() {
            api.prevent_close();
            if let Err(error) = window.emit("desktop:save-requested", ()) {
                eprintln!("Could not flush hidden workspace: {error}");
            }
        }
    }
}

#[tauri::command]
pub fn desktop_set_ready(app: AppHandle, ready: bool) -> Result<(), String> {
    let state = app.state::<DesktopState>();
    state
        .quit_item
        .set_enabled(ready)
        .map_err(|e| e.to_string())?;
    state.ready.store(ready, Ordering::Release);
    Ok(())
}

#[tauri::command]
pub fn desktop_finish_exit(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn desktop_show_main(app: AppHandle) {
    show_main_window(&app);
}
