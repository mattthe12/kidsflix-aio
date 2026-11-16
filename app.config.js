/**
 * Expo config wrapper.
 *
 * GitHub Pages serves a project site from /<repository>/, so the Pages build
 * keeps the existing EXPO_BASE_URL=/kidsflix-aio path until the repository is
 * renamed. Normal local and root-hosted builds leave the base URL empty.
 */
const expo = require('./app.json').expo;
const baseUrl = (process.env.EXPO_BASE_URL || '').trim();

module.exports = {
  ...expo,
  ...(baseUrl
    ? { experiments: { ...(expo.experiments ?? {}), baseUrl } }
    : {}),
};
