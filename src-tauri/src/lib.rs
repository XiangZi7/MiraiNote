mod commands;
mod desktop;
mod error;
mod files;
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
        .manage(files::Grants::default())
        .plugin(tauri_plugin_opener::init())
        .setup(desktop::setup)
        .on_window_event(desktop::on_window_event)
        .invoke_handler(tauri::generate_handler![
            desktop::desktop_set_ready,
            desktop::desktop_finish_exit,
            desktop::desktop_show_main,
            launch_files::desktop_take_launch_files,
            files::files_pick_folder,
            files::files_pick_documents,
            files::files_scan_folder,
            files::files_stat,
            files::files_read,
            commands::agent::agent_get_settings,
            commands::agent::agent_save_profile,
            commands::agent::agent_delete_profile,
            commands::agent::agent_activate_profile,
            commands::agent::agent_reveal_key,
            commands::agent::agent_list_models,
            commands::agent::agent_test_profile,
            commands::agent::agent_start,
            commands::agent::agent_send,
            commands::agent::agent_step,
            commands::agent::agent_cancel,
            commands::agent::agent_forget,
            commands::agent::agent_list_conversations,
            commands::agent::agent_open_conversation,
            commands::agent::agent_rename_conversation,
            commands::agent::agent_delete_conversation,
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("MiraiNote could not start: {error}");
        std::process::exit(1);
    }
}
