mod commands;
mod error;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = tauri::Builder::default()
        .manage(services::agent::manager::AgentService::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
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
