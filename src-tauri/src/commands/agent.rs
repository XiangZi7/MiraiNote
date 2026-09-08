use crate::{
    error::AppResult,
    services::agent::{
        config::{ProfileInput, PublicSettings},
        manager::{AgentService, CompletionInput, CompletionResult},
        models::ModelListInput,
    },
};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn agent_get_settings(
    app: AppHandle,
    service: State<'_, AgentService>,
) -> AppResult<PublicSettings> {
    service.settings(&app)
}
#[tauri::command]
pub fn agent_save_profile(
    app: AppHandle,
    service: State<'_, AgentService>,
    input: ProfileInput,
    clear_key: bool,
) -> AppResult<PublicSettings> {
    service.save(&app, input, clear_key)
}
#[tauri::command]
pub fn agent_delete_profile(
    app: AppHandle,
    service: State<'_, AgentService>,
    id: String,
) -> AppResult<PublicSettings> {
    service.remove(&app, &id)
}
#[tauri::command]
pub fn agent_activate_profile(
    app: AppHandle,
    service: State<'_, AgentService>,
    id: String,
) -> AppResult<PublicSettings> {
    service.activate(&app, &id)
}
#[tauri::command]
pub async fn agent_list_models(
    app: AppHandle,
    service: State<'_, AgentService>,
    input: ModelListInput,
) -> AppResult<Vec<String>> {
    service.list_models(&app, input).await
}
#[tauri::command]
pub async fn agent_test_profile(
    app: AppHandle,
    service: State<'_, AgentService>,
    input: ProfileInput,
    clear_key: bool,
) -> AppResult<String> {
    service.test(&app, input, clear_key).await
}
#[tauri::command]
pub async fn agent_complete(
    app: AppHandle,
    service: State<'_, AgentService>,
    input: CompletionInput,
) -> AppResult<CompletionResult> {
    service.complete(&app, input).await
}
#[tauri::command]
pub fn agent_cancel(service: State<'_, AgentService>, run_id: String) -> AppResult<()> {
    service.cancel(Some(&run_id))
}
