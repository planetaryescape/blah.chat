/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your blah.chat API key (get from Settings > CLI API Keys) */
  "apiKey": string,
  /** Convex URL - Convex deployment URL (leave empty for default production) */
  "convexUrl"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask` command */
  export type Ask = ExtensionPreferences & {}
  /** Preferences accessible in the `continue` command */
  export type Continue = ExtensionPreferences & {}
  /** Preferences accessible in the `recent` command */
  export type Recent = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `memories` command */
  export type Memories = ExtensionPreferences & {}
  /** Preferences accessible in the `projects` command */
  export type Projects = ExtensionPreferences & {}
  /** Preferences accessible in the `bookmarks` command */
  export type Bookmarks = ExtensionPreferences & {}
  /** Preferences accessible in the `templates` command */
  export type Templates = ExtensionPreferences & {}
  /** Preferences accessible in the `tasks` command */
  export type Tasks = ExtensionPreferences & {}
  /** Preferences accessible in the `notes` command */
  export type Notes = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ask` command */
  export type Ask = {
  /** Ask anything... */
  "query": string
}
  /** Arguments passed to the `continue` command */
  export type Continue = {}
  /** Arguments passed to the `recent` command */
  export type Recent = {}
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `memories` command */
  export type Memories = {}
  /** Arguments passed to the `projects` command */
  export type Projects = {}
  /** Arguments passed to the `bookmarks` command */
  export type Bookmarks = {}
  /** Arguments passed to the `templates` command */
  export type Templates = {}
  /** Arguments passed to the `tasks` command */
  export type Tasks = {}
  /** Arguments passed to the `notes` command */
  export type Notes = {}
}

