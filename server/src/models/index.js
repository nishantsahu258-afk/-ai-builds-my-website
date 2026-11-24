import RawUser from './User.js';
import RawBusiness from './Business.js';
import RawProject from './Project.js';
import RawSource from './Source.js';
import RawFact from './Fact.js';
import RawWebsite from './Website.js';
import RawWebsiteVersion from './WebsiteVersion.js';
import RawGenerationJob from './GenerationJob.js';
import { createLocalModel } from './localStore.js';

export const User = createLocalModel('users', RawUser);
export const Business = createLocalModel('businesses', RawBusiness);
export const Project = createLocalModel('projects', RawProject);
export const Source = createLocalModel('sources', RawSource);
export const Fact = createLocalModel('facts', RawFact);
export const Website = createLocalModel('websites', RawWebsite);
export const WebsiteVersion = createLocalModel('websiteVersions', RawWebsiteVersion);
export const GenerationJob = createLocalModel('generationJobs', RawGenerationJob);

export default {
  User,
  Business,
  Project,
  Source,
  Fact,
  Website,
  WebsiteVersion,
  GenerationJob,
};
