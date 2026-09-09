import type { InjectionKey } from 'vue'

export const paneHostsKey: InjectionKey<Map<string, HTMLElement>> = Symbol('pane-hosts')
