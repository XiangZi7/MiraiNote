use crate::{
    error::AppResult,
    services::agent::{
        config::{ProfileInput, PublicSettings},
        history::Summary,
        manager::{AgentService, SendInput, Snapshot, StartInput},
        models::ModelListInput,
    },
};
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn agent_get_settings(
    app: AppHandle,
    service: State<'_, AgentService>,
) -> AppResult<PublicSettings> {
    service.settings(&app).await
}
#[tauri::command]
pub async fn agent_save_profile(
    app: AppHandle,
    service: State<'_, AgentService>,
    input: ProfileInput,
    clear_key: bool,
) -> AppResult<PublicSettings> {
    service.save(&app, input, clear_key).await
}
#[tauri::command]
pub async fn agent_delete_profile(
    app: AppHandle,
    service: State<'_, AgentService>,
    id: String,
) -> AppResult<PublicSettings> {
    service.remove(&app, &id).await
}
#[tauri::command]
pub async fn agent_activate_profile(
    app: AppHandle,
    service: State<'_, AgentService>,
    id: String,
) -> AppResult<PublicSettings> {
    service.activate(&app, &id).await
}
#[tauri::command]
pub async fn agent_reveal_key(
    app: AppHandle,
    service: State<'_, AgentService>,
    id: String,
) -> AppResult<String> {
    service.reveal_key(&app, &id).await
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
pub async fn agent_start(
    app: AppHandle,
    service: State<'_, AgentService>,
    input: StartInput,
) -> AppResult<Snapshot> {
    service.start(&app, input).await
}
#[tauri::command]
pub async fn agent_send(
    app: AppHandle,
    service: State<'_, AgentService>,
    input: SendInput,
) -> AppResult<Snapshot> {
    service.send(&app, input).await
}
#[tauri::command]
pub async fn agent_step(
    app: AppHandle,
    service: State<'_, AgentService>,
    run_id: String,
) -> AppResult<Snapshot> {
    service.step(&app, &run_id).await
}
#[tauri::command]
pub async fn agent_cancel(
    app: AppHandle,
    service: State<'_, AgentService>,
    run_id: String,
) -> AppResult<()> {
    service.cancel(&app, Some(&run_id)).await
}
#[tauri::command]
pub async fn agent_forget(
    app: AppHandle,
    service: State<'_, AgentService>,
    run_id: String,
) -> AppResult<()> {
    service.forget(&app, &run_id).await
}
#[tauri::command]
pub async fn agent_list_conversations(
    app: AppHandle,
    service: State<'_, AgentService>,
    document_id: String,
) -> AppResult<Vec<Summary>> {
    service.list_conversations(&app, &document_id).await
}
#[tauri::command]
pub async fn agent_open_conversation(
    app: AppHandle,
    service: State<'_, AgentService>,
    document_id: String,
    conversation_id: String,
) -> AppResult<Snapshot> {
    service
        .open_conversation(&app, &document_id, &conversation_id)
        .await
}
#[tauri::command]
pub async fn agent_rename_conversation(
    app: AppHandle,
    service: State<'_, AgentService>,
    document_id: String,
    conversation_id: String,
    title: String,
) -> AppResult<Summary> {
    service
        .rename_conversation(&app, &document_id, &conversation_id, &title)
        .await
}
#[tauri::command]
pub async fn agent_delete_conversation(
    app: AppHandle,
    service: State<'_, AgentService>,
    document_id: String,
    conversation_id: String,
) -> AppResult<()> {
    service
        .delete_conversation(&app, &document_id, &conversation_id)
        .await
}
