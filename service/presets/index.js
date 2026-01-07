/**
 * presets/index.js - Built-in source presets for common patterns
 *
 * Presets reduce config verbosity by providing sensible defaults
 * for common polling sources like GitHub issues and Linear tickets.
 */

/**
 * Built-in presets registry
 * Key format: "provider/preset-name"
 */
export const PRESETS = {
  // GitHub presets
  "github/my-issues": {
    name: "my-issues",
    tool: {
      mcp: "github",
      name: "search_issues",
    },
    args: {
      q: "is:issue assignee:@me state:open",
    },
    item: {
      id: "{html_url}",
    },
  },

  "github/review-requests": {
    name: "review-requests",
    tool: {
      mcp: "github",
      name: "search_issues",
    },
    args: {
      q: "is:pr review-requested:@me state:open",
    },
    item: {
      id: "{html_url}",
    },
  },

  "github/my-prs-feedback": {
    name: "my-prs-feedback",
    tool: {
      mcp: "github",
      name: "search_issues",
    },
    args: {
      q: "is:pr author:@me state:open review:changes_requested",
    },
    item: {
      id: "{html_url}",
    },
  },

  // Linear presets
  "linear/my-issues": {
    name: "my-issues",
    tool: {
      mcp: "linear",
      name: "list_issues",
    },
    args: {
      // teamId and assigneeId are required - user must provide
    },
    item: {
      id: "linear:{id}",
    },
  },
};

/**
 * Get a preset by name
 * @param {string} presetName - Preset identifier (e.g., "github/my-issues")
 * @returns {object|null} Preset configuration or null if not found
 */
export function getPreset(presetName) {
  return PRESETS[presetName] || null;
}

/**
 * List all available preset names
 * @returns {string[]} Array of preset names
 */
export function listPresets() {
  return Object.keys(PRESETS);
}

/**
 * Expand a preset into a full source configuration
 * User config is merged on top of preset defaults
 * @param {string} presetName - Preset identifier
 * @param {object} userConfig - User's source config (overrides preset)
 * @returns {object} Merged source configuration
 * @throws {Error} If preset is unknown
 */
export function expandPreset(presetName, userConfig) {
  const preset = getPreset(presetName);
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  // Deep merge: preset as base, user config on top
  return {
    ...preset,
    ...userConfig,
    // Merge nested objects specially
    tool: userConfig.tool || preset.tool,
    args: {
      ...preset.args,
      ...(userConfig.args || {}),
    },
    item: userConfig.item || preset.item,
    // Remove the preset key from final output
    preset: undefined,
  };
}

/**
 * Expand GitHub shorthand syntax into full source config
 * @param {string} query - GitHub search query
 * @param {object} userConfig - Rest of user's source config
 * @returns {object} Full source configuration
 */
export function expandGitHubShorthand(query, userConfig) {
  return {
    ...userConfig,
    tool: {
      mcp: "github",
      name: "search_issues",
    },
    args: {
      q: query,
    },
    item: {
      id: "{html_url}",
    },
    // Remove the github key from final output
    github: undefined,
  };
}
