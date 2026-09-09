mod commands;
mod desktop;
mod error;
mod launch_files;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = tauri::Builder::default()
        .manage(launch_files::LaunchFiles::from_env())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            launch_files::receive(app, args, cwd);
            desktop::show_main_window(app);
        }))
        .manage(services::agent::manager::AgentService::default())
        .plugin(tauri_plugin_opener::init())
        .setup(desktop::setup)
        .on_window_event(desktop::on_window_event)
        .invoke_handler(tauri::generate_handler![
            desktop::desktop_set_ready,
            desktop::desktop_finish_exit,
            desktop::desktop_show_main,
            launch_files::desktop_take_launch_files,
            commands::agent::agent_get_settings,
            commands::agent::agent_save_profile,
            commands::agent::agent_delete_profile,
            commands::agent::agent_activate_profile,
            commands::agent::agent_list_models,
            commands::agent::agent_test_profile,
            commands::agent::agent_complete,
            commands::agent::agent_cancel,
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("MiraiNote could not start: {error}");
        std::process::exit(1);
    }
}
