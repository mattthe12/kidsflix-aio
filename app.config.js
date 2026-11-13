/**
 * Expo config wrapper.
 *
 * GitHub Pages serves a project site from /<repository>/, so the Pages build
 * sets EXPO_BASE_URL=/kidsflix-aio. Normal local and root-hosted builds leave
 * the base URL empty and keep their existing paths.
 */
const expo = require('./app.json').expo;
const baseUrl = (process.env.EXPO_BASE_URL || '').trim();

module.exports = {
  ...expo,
  ...(baseUrl
    ? { experiments: { ...(expo.experiments ?? {}), baseUrl } }
    : {}),
};
