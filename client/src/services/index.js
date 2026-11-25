import api from './api.js';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const projectsService = {
  list: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const sourcesService = {
  uploadFile: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/projects/${projectId}/sources/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  addLink: (projectId, data) => api.post(`/projects/${projectId}/sources/links`, data),
  list: (projectId) => api.get(`/projects/${projectId}/sources`),
  exclude: (sourceId) => api.post(`/sources/${sourceId}/exclude`),
  retry: (sourceId) => api.post(`/sources/${sourceId}/retry`),
  delete: (sourceId) => api.delete(`/sources/${sourceId}`),
};

export const factsService = {
  list: (projectId) => api.get(`/projects/${projectId}/facts`),
  update: (factId, data) => api.patch(`/facts/${factId}`, data),
  confirm: (factId, data) => api.post(`/facts/${factId}/confirm`, data),
  reject: (factId) => api.post(`/facts/${factId}/reject`),
  addManual: (projectId, data) => api.post(`/projects/${projectId}/facts/manual`, data),
};

export const websitesService = {
  get: (id) => api.get(`/websites/${id}`),
  updateTheme: (id, theme) => api.patch(`/websites/${id}`, { theme }),
  updateSection: (id, sectionId, data) => api.patch(`/websites/${id}/sections/${sectionId}`, data),
  regenerateSection: (id, sectionId, instructions) =>
    api.post(`/websites/${id}/sections/${sectionId}/regenerate`, { instructions }),
  toggleSection: (id, sectionId) => api.patch(`/websites/${id}/sections/${sectionId}/toggle`),
  reorderSections: (id, order) => api.patch(`/websites/${id}/reorder`, { order }),
};

export const publishingService = {
  publish: (id) => api.post(`/websites/${id}/publish`),
  unpublish: (id) => api.post(`/websites/${id}/unpublish`),
  getVersions: (id) => api.get(`/websites/${id}/versions`),
  getPublicSite: (slug) => api.get(`/public/sites/${slug}`),
};

export const generationService = {
  generate: (projectId, data = {}) => api.post(`/projects/${projectId}/generate`, data),
  startResearch: (projectId) => api.post(`/projects/${projectId}/research`),
  getResearchStatus: (projectId) => api.get(`/projects/${projectId}/research-status`),
  getJobStatus: (jobId) => api.get(`/jobs/${jobId}`),
};
