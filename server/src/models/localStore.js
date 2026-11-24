import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial storage structure
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.warn('[LocalStore] Error reading store.json, reinitializing:', err.message);
  }
  return {
    users: [],
    businesses: [],
    projects: [],
    sources: [],
    facts: [],
    websites: [],
    websiteVersions: [],
    generationJobs: [],
  };
}

let store = loadData();

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    logger.error('[LocalStore] Error saving store.json:', err.message);
  }
}

// Generate realistic 24-char hex ObjectId string
function newObjectId() {
  const chars = 'abcdef0123456789';
  let id = '';
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Match query filters
function matchQuery(item, query = {}) {
  for (const [key, val] of Object.entries(query)) {
    if (val && typeof val === 'object' && val.$ne !== undefined) {
      if (item[key] === val.$ne) return false;
      continue;
    }
    const itemVal = item[key] ? item[key].toString() : item[key];
    const targetVal = val ? val.toString() : val;
    if (itemVal !== targetVal) return false;
  }
  return true;
}

class StoreQuery {
  constructor(collectionName, results) {
    this.collectionName = collectionName;
    this.results = results;
    this._sortField = null;
    this._sortDir = 1;
    this._populates = [];
  }

  sort(sortObj) {
    if (sortObj) {
      const [field, dir] = Object.entries(sortObj)[0];
      this._sortField = field;
      this._sortDir = dir === -1 || dir === 'desc' ? -1 : 1;
    }
    return this;
  }

  populate(field) {
    this._populates.push(field);
    return this;
  }

  select() {
    return this;
  }

  limit(n) {
    this.results = this.results.slice(0, n);
    return this;
  }

  lean() {
    return this;
  }

  then(resolve, reject) {
    try {
      let finalResults = Array.isArray(this.results) ? [...this.results] : this.results ? { ...this.results } : null;

      if (Array.isArray(finalResults) && this._sortField) {
        finalResults.sort((a, b) => {
          const valA = a[this._sortField] || 0;
          const valB = b[this._sortField] || 0;
          return valA > valB ? this._sortDir : -this._sortDir;
        });
      }

      // Populate references
      const doPopulate = (item) => {
        if (!item) return item;
        const populated = { ...item };
        for (const popField of this._populates) {
          if (popField === 'businessId' && populated.businessId) {
            populated.businessId = store.businesses.find(
              (b) => b._id.toString() === populated.businessId.toString()
            ) || populated.businessId;
          }
          if (popField === 'currentWebsiteId' && populated.currentWebsiteId) {
            populated.currentWebsiteId = store.websites.find(
              (w) => w._id.toString() === populated.currentWebsiteId.toString()
            ) || populated.currentWebsiteId;
          }
        }
        return populated;
      };

      if (Array.isArray(finalResults)) {
        finalResults = finalResults.map(doPopulate);
      } else if (finalResults) {
        finalResults = doPopulate(finalResults);
      }

      resolve(finalResults);
    } catch (err) {
      reject(err);
    }
  }
}

// Wrapper for documents with .save() method
function wrapDoc(collectionName, item) {
  if (!item) return null;
  const doc = { ...item };

  doc.save = async function () {
    const list = store[collectionName] || [];
    const idx = list.findIndex((x) => x._id.toString() === doc._id.toString());
    doc.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = { ...doc };
    } else {
      list.push({ ...doc });
    }
    saveData();
    return doc;
  };

  doc.markModified = function () {};

  if (collectionName === 'users') {
    doc.comparePassword = async function (plain) {
      return bcrypt.compare(plain, doc.passwordHash);
    };
  }

  return doc;
}

export function createLocalModel(collectionName, mongooseModel) {
  return new Proxy(mongooseModel, {
    get(target, prop) {
      // If MongoDB is actively connected, use real Mongoose
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        return target[prop];
      }

      // Otherwise, use resilient Local Store fallback
      if (prop === 'findOne') {
        return (query) => {
          const list = store[collectionName] || [];
          const found = list.find((item) => matchQuery(item, query));
          const wrapped = wrapDoc(collectionName, found);
          return new StoreQuery(collectionName, wrapped);
        };
      }

      if (prop === 'findById') {
        return (id) => {
          const list = store[collectionName] || [];
          const found = list.find((item) => item._id && item._id.toString() === id.toString());
          const wrapped = wrapDoc(collectionName, found);
          return new StoreQuery(collectionName, wrapped);
        };
      }

      if (prop === 'find') {
        return (query = {}) => {
          const list = store[collectionName] || [];
          const filtered = list.filter((item) => matchQuery(item, query));
          const wrapped = filtered.map((item) => wrapDoc(collectionName, item));
          return new StoreQuery(collectionName, wrapped);
        };
      }

      if (prop === 'create') {
        return async (data) => {
          const items = Array.isArray(data) ? data : [data];
          const createdList = [];

          for (const item of items) {
            const newItem = {
              _id: newObjectId(),
              ...item,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // If user, ensure passwordHash is hashed
            if (collectionName === 'users') {
              const rawPass = newItem.passwordHash || newItem.password;
              if (rawPass && !rawPass.startsWith('$2')) {
                const salt = await bcrypt.genSalt(10);
                newItem.passwordHash = await bcrypt.hash(rawPass, salt);
              }
              delete newItem.password;
            }

            store[collectionName] = store[collectionName] || [];
            store[collectionName].push(newItem);
            saveData();
            createdList.push(wrapDoc(collectionName, newItem));
          }

          return Array.isArray(data) ? createdList : createdList[0];
        };
      }

      if (prop === 'findByIdAndUpdate') {
        return async (id, update) => {
          const list = store[collectionName] || [];
          const idx = list.findIndex((x) => x._id.toString() === id.toString());
          if (idx === -1) return null;

          const fieldsToUpdate = update.$set || update;
          list[idx] = {
            ...list[idx],
            ...fieldsToUpdate,
            updatedAt: new Date().toISOString(),
          };
          saveData();
          return wrapDoc(collectionName, list[idx]);
        };
      }

      if (prop === 'updateMany') {
        return async (query, update) => {
          const list = store[collectionName] || [];
          const fieldsToUpdate = update.$set || update;
          let count = 0;
          for (let i = 0; i < list.length; i++) {
            if (matchQuery(list[i], query)) {
              list[i] = { ...list[i], ...fieldsToUpdate, updatedAt: new Date().toISOString() };
              count++;
            }
          }
          saveData();
          return { modifiedCount: count };
        };
      }

      if (prop === 'findByIdAndDelete') {
        return async (id) => {
          const list = store[collectionName] || [];
          const idx = list.findIndex((x) => x._id.toString() === id.toString());
          if (idx === -1) return null;
          const removed = list.splice(idx, 1)[0];
          saveData();
          return wrapDoc(collectionName, removed);
        };
      }

      if (prop === 'countDocuments') {
        return async (query = {}) => {
          const list = store[collectionName] || [];
          return list.filter((item) => matchQuery(item, query)).length;
        };
      }

      return target[prop];
    },
  });
}
